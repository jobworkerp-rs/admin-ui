import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobClient, jobStatusClient, jobResultClient } from '@/lib/client';
import { FindJobProcessingStatusRequest, CleanupRequest, JobProcessingStatusDetailResponse } from '@/lib/grpc/jobworkerp/service/job';
import { JobId } from '@/lib/grpc/jobworkerp/data/job';
import { FindJobResultListRequest, DeleteJobResultBulkRequest } from '@/lib/grpc/jobworkerp/service/job_result';
import { JobResult } from '@/lib/grpc/jobworkerp/data/job_result';

// Fetch job status list (Advanced search)
export function useJobStatusList(request: FindJobProcessingStatusRequest) {
    return useQuery({
        queryKey: ['job-status-list', request],
        queryFn: async () => {
            const response = jobStatusClient.findByCondition(request);
            const items: JobProcessingStatusDetailResponse[] = [];
            for await (const item of response) {
                items.push(item);
            }
            return items;
        },
    });
}

// Fetch single job details (including args and status if needed)
// Note: JobService.find returns OptionalJobResponse (data: Job)
export function useJob(id?: string) {
    return useQuery({
        queryKey: ['job', id],
        queryFn: async () => {
            if (!id) throw new Error("ID is required");
            const jId = JobId.create({ value: id });

            // Parallel fetch for job data and status if possible, 
            // but JobProcessingStatusService.find returns OptionalJobProcessingStatusResponse

            const jobResponse = await jobClient.find(jId);
            const statusResponse = await jobStatusClient.find(jId);

            // We might also want result if finished, but let's stick to basic info first.
            // Result is in JobResultService
            const resultResponse = await jobResultClient.find(jId);

            return {
                job: jobResponse.data,
                status: statusResponse.status,
                result: resultResponse.data
            };
        },
        enabled: !!id,
    });
}

export function useCleanupJobs() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (req: CleanupRequest) => {
            return await jobStatusClient.cleanup(req);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-status-list'] });
        },
    });
}

export function useCancelJob() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const jId = JobId.create({ value: id });
            return await jobClient.delete(jId);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['job', id] });
            queryClient.invalidateQueries({ queryKey: ['job-status-list'] });
        },
    });
}

export function useJobResults(request: FindJobResultListRequest) {
    return useQuery({
        queryKey: ['job-result-list', request],
        queryFn: async () => {
            const response = jobResultClient.findListBy(request);
            const items: JobResult[] = [];
            for await (const item of response) {
                items.push(item);
            }
            return items;
        },
    });
}

export function useDeleteJobResultsBulk() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (req: DeleteJobResultBulkRequest) => {
            return await jobResultClient.deleteBulk(req);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-result-list'] });
        },
    });
}

export function useJobResult(id?: string) {
    return useQuery({
        queryKey: ['job-result', id],
        queryFn: async () => {
            if (!id) throw new Error("ID is required");
            // Note: JobResultService.find takes JobResultId { value: number (int64) }
            // But our ID in URL might be string. We need to parse it.
            // Wait, JobResultId value is int64. The URL param will be string.
            // We need to parse it to BigInt or similar? 
            // The proto definition says `int64 value = 1`. In JS/TS with ts-proto, it's usually number or string (if long).
            // Let's check JobResultId definition. It says `value: number`.
            // Wait, int64 is usually string or number? TS proto config usually sets to string for 64bit.
            // Let's assume it accepts the string representation if configured so, or needs parsing.
            // Let's check JobResultId definition again.
            // It was imported from `../data/job_result`.
            // In line 101 of job_result.proto: message JobResultId { int64 value = 1; }

            // JobResultId value is string (int64)
            return await jobResultClient.find({ value: id });
        },
        enabled: !!id,
    });
}

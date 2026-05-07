import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { jobClient, jobStatusClient, jobResultClient } from '@/lib/client';
import { FindJobProcessingStatusRequest, PurgeStaleJobsRequest, JobProcessingStatusDetailResponse } from '@/lib/grpc/jobworkerp/service/job';
import { JobId } from '@/lib/grpc/jobworkerp/data/job';
import { FindJobResultListRequest, DeleteJobResultBulkRequest } from '@/lib/grpc/jobworkerp/service/job_result';
import { JobResult } from '@/lib/grpc/jobworkerp/data/job_result';
import { isMissingEntityError, retryUnlessMissing } from '@/lib/grpc-utils';


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

            // Tolerate WorkerNotFound so the detail page still renders job
            // info when the referenced worker has been deleted.
            let resultData;
            try {
                const resultResponse = await jobResultClient.find(jId);
                resultData = resultResponse.data;
            } catch (e) {
                if (isMissingEntityError(e)) {
                    console.warn(
                        'jobResultClient.find failed (worker/runner may be deleted); continuing without result data:',
                        e,
                    );
                    resultData = undefined;
                } else {
                    throw e;
                }
            }

            return {
                job: jobResponse.data,
                status: statusResponse.status,
                result: resultData
            };
        },
        enabled: !!id,
    });
}

export function usePurgeStaleJobs() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (req: PurgeStaleJobsRequest) => {
            return await jobStatusClient.purgeStaleJobs(req);
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
            // JobResultId value is string (int64)
            return await jobResultClient.find({ value: id });
        },
        enabled: !!id,
        retry: retryUnlessMissing,
    });
}

import { useQuery, useMutation } from '@tanstack/react-query';
import { jobStatusClient, jobRestoreClient } from '@/lib/client';
import { JobProcessingStatus } from '@/lib/grpc/jobworkerp/data/common';
import { JobProcessingStatusDetailResponse } from '@/lib/grpc/jobworkerp/service/job';

export const useStuckJobs = (minElapsedTimeMs: number) => {
    return useQuery({
        queryKey: ['system', 'stuck-jobs', minElapsedTimeMs],
        queryFn: async () => {
            const jobs: JobProcessingStatusDetailResponse[] = [];
            if (minElapsedTimeMs <= 0) return jobs;

            // Find Running jobs exceeding time
            for await (const item of jobStatusClient.findByCondition({
                status: JobProcessingStatus.RUNNING,
                minElapsedTimeMs: String(minElapsedTimeMs),
                limit: 100,
                descending: true
            })) {
                jobs.push(item);
            }
            return jobs;
        },
        enabled: minElapsedTimeMs > 0,
        refetchOnWindowFocus: false,
    });
};

export const useCleanupSystem = () => {
    return useMutation({
        mutationFn: async (retentionHoursOverride?: number) => {
            return await jobStatusClient.cleanup({
                retentionHoursOverride: retentionHoursOverride ? String(retentionHoursOverride) : undefined
            });
        }
    });
};

export const useRestoreJobs = () => {
    return useMutation({
        mutationFn: async (opts: { includeGrabbed: boolean, limit?: number }) => {
            return await jobRestoreClient.restore({
                includeGrabbed: opts.includeGrabbed,
                limit: opts.limit
            });
        }
    });
};

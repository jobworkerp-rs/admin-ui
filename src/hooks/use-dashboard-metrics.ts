import { useQuery } from '@tanstack/react-query';
import { jobStatusClient, workerClient } from '@/lib/client';
import { JobProcessingStatus } from '@/lib/grpc/jobworkerp/data/common';

export const useWorkerCount = (opts?: { refetchInterval?: number | false }) => {
    return useQuery({
        queryKey: ['workers', 'count'],
        queryFn: async () => {
            const res = await workerClient.countBy({
                runnerTypes: [],
                runnerIds: [],
            });
            return parseInt(res.total.toString(), 10);
        },
        refetchInterval: opts?.refetchInterval
    })
};

export const useActiveJobsStats = (opts?: { refetchInterval?: number | false }) => {
    return useQuery({
        queryKey: ['jobs', 'processing-status'],
        queryFn: async () => {
            const stats = {
                pending: 0,
                running: 0,
                waitResult: 0,
                total: 0
            };
            try {
                for await (const item of jobStatusClient.findAll({})) {
                    stats.total++;
                    if (item.status === JobProcessingStatus.PENDING) stats.pending++;
                    else if (item.status === JobProcessingStatus.RUNNING) stats.running++;
                    else if (item.status === JobProcessingStatus.WAIT_RESULT) stats.waitResult++;
                }
            } catch (e) {
                console.error("Failed to fetch active job stats", e);
            }
            return stats;
        },
        refetchInterval: opts?.refetchInterval
    });
};

export const useChannelStats = (opts?: { refetchInterval?: number | false }) => {
    return useQuery({
        queryKey: ['workers', 'channels'],
        queryFn: async () => {
            const res = await workerClient.findChannelList({});
            return res.channels;
        },
        refetchInterval: opts?.refetchInterval
    })
};

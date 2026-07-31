import { useQuery } from '@tanstack/react-query';
import { workerInstanceClient } from '@/lib/client';
import { WorkerInstance } from '@/lib/grpc/jobworkerp/data/worker_instance';
import { retryUnavailable } from '@/lib/grpc-utils';

export interface WorkerInstanceListOptions {
    includeInactive: boolean;
    channel?: string;
}

export interface WorkerInstanceOverview {
    total: string;
    active: string;
    channels: Awaited<ReturnType<typeof workerInstanceClient.findChannelList>>['channels'];
    instances: WorkerInstance[];
    activeInstanceIds: Set<string>;
}

async function collectInstances(activeOnly: boolean, channel?: string): Promise<WorkerInstance[]> {
    const instances: WorkerInstance[] = [];
    const response = workerInstanceClient.findList({ activeOnly, channel });
    for await (const instance of response) {
        instances.push(instance);
    }
    return instances;
}

export function useWorkerInstanceOverview(options: WorkerInstanceListOptions) {
    return useQuery({
        queryKey: ['worker-instances', options.includeInactive, options.channel],
        queryFn: async (): Promise<WorkerInstanceOverview> => {
            const [count, channels, activeInstances, allInstances] = await Promise.all([
                workerInstanceClient.count({}),
                workerInstanceClient.findChannelList({}),
                collectInstances(true, options.channel),
                options.includeInactive
                    ? collectInstances(false, options.channel)
                    : Promise.resolve<WorkerInstance[] | undefined>(undefined),
            ]);
            const activeInstanceIds = new Set(
                activeInstances.flatMap((instance) => instance.id ? [instance.id.value] : []),
            );
            return {
                total: count.total,
                active: count.active,
                channels: channels.channels,
                instances: allInstances ?? activeInstances,
                activeInstanceIds,
            };
        },
        retry: retryUnavailable,
        retryDelay: 1000,
    });
}

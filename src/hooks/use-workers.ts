import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workerClient } from '@/lib/client';
import { FindWorkerListRequest, CountWorkerRequest } from '@/lib/grpc/jobworkerp/service/worker';
import { Worker, WorkerId, WorkerData } from '@/lib/grpc/jobworkerp/data/worker';
import { RunnerId } from '@/lib/grpc/jobworkerp/data/runner';

// Fetch list of workers
export function useWorkers(request: FindWorkerListRequest) {
    return useQuery({
        queryKey: ['workers', request],
        queryFn: async () => {
            const response = workerClient.findList(request);
            const workers: Worker[] = [];
            for await (const worker of response) {
                workers.push(worker);
            }
            return workers;
        },
    });
}

// Fetch single worker
export function useWorker(id?: string) {
    return useQuery({
        queryKey: ['worker', id],
        queryFn: async () => {
            if (!id) throw new Error("ID is required");
            const wId = WorkerId.create({ value: id });
            const response = await workerClient.find(wId);
            return response.data;
        },
        enabled: !!id,
    });
}

// Count workers
export function useCountWorkers(request: CountWorkerRequest) {
    return useQuery({
        queryKey: ['workers-count', request],
        queryFn: async () => {
            const response = await workerClient.countBy(request);
            return parseInt(response.total); // Convert string (int64) to number
        },
    });
}

// Helper to count workers by runner ID
export function useCountWorkersByRunner(runnerId: string) {
    return useCountWorkers({
        runnerTypes: [],
        runnerIds: [RunnerId.create({ value: runnerId })],
    });
}

export function useCreateWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: WorkerData) => {
            return await workerClient.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
        },
    });
}

export function useUpdateWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: WorkerData }) => {
            const wId = WorkerId.create({ value: id });
            return await workerClient.update({ id: wId, data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['worker'] });
        },
    });
}

export function useDeleteWorker() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const wId = WorkerId.create({ value: id });
            return await workerClient.delete(wId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
        },
    });
}

// Fetch list of channels
export function useChannelList() {
    return useQuery({
        queryKey: ['channels'],
        queryFn: async () => {
            const response = await workerClient.findChannelList({});
            // Extract channel names and filter out undefined/empty
            return response.channels
                .map(c => c.name)
                .filter((c): c is string => !!c);
        },
    });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { runnerClient } from '@/lib/client';
import { FindRunnerListRequest, CreateRunnerRequest } from '@/lib/grpc/jobworkerp/service/runner';
import { Runner, RunnerId } from '@/lib/grpc/jobworkerp/data/runner';

// Fetch list of runners
export function useRunners(request: FindRunnerListRequest = { runnerTypes: [] }) {
    return useQuery({
        queryKey: ['runners', request],
        queryFn: async () => {
            const response = runnerClient.findListBy(request);
            const runners: Runner[] = [];
            for await (const runner of response) {
                runners.push(runner);
            }
            return runners;
        },
    });
}

// Fetch single runner
export function useRunner(id?: string) {
    return useQuery({
        queryKey: ['runner', id],
        queryFn: async () => {
            if (!id) throw new Error("ID is required");
            const rId = RunnerId.create({ value: id });
            const response = await runnerClient.find(rId);
            return response.data;
        },
        enabled: !!id,
    });
}

// Create runner
export function useCreateRunner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateRunnerRequest) => {
            return await runnerClient.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runners'] });
        },
    });
}

// Delete runner
export function useDeleteRunner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const rId = RunnerId.create({ value: id });
            return await runnerClient.delete(rId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runners'] });
        },
    });
}

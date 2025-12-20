import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functionSetClient } from '@/lib/client';
import { FunctionSet, FunctionSetData } from '@/lib/grpc/jobworkerp/function/data/function_set';

export const useFunctionSets = (limit = 10, offset = "0") => {
    return useQuery({
        queryKey: ['function-sets', 'list', limit, offset],
        queryFn: async () => {
            const sets: FunctionSet[] = [];
            const stream = functionSetClient.findList({ limit, offset });
            for await (const set of stream) {
                sets.push(set);
            }
            return sets;
        }
    });
};

export const useFunctionSet = (id?: string) => {
    return useQuery({
        queryKey: ['function-sets', 'detail', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await functionSetClient.find({ value: id });
            return res.data;
        },
        enabled: !!id
    })
}

export const useCreateFunctionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: FunctionSetData) => {
            return await functionSetClient.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['function-sets'] });
        }
    })
}

export const useUpdateFunctionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: { id: string, data: FunctionSetData }) => {
            return await functionSetClient.update({
                id: { value: vars.id },
                data: vars.data
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['function-sets'] });
        }
    })
}

export const useDeleteFunctionSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            return await functionSetClient.delete({ value: id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['function-sets'] });
        }
    })
}

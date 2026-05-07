import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientError, Status } from 'nice-grpc-web';
import JobResultDetail from '@/pages/results/detail';
import { jobResultClient, workerClient, runnerClient } from '@/lib/client';
import { ResultStatus, Priority } from '@/lib/grpc/jobworkerp/data/common';

vi.mock('@/lib/client', () => ({
    jobResultClient: {
        find: vi.fn(),
    },
    workerClient: {
        find: vi.fn(),
    },
    runnerClient: {
        find: vi.fn(),
    },
}));

const renderWithProviders = (id: string) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/results/${id}`]}>
                <Routes>
                    <Route path="/results/:id" element={<JobResultDetail />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

const baseResultData = {
    jobId: { value: 'job1' },
    workerId: { value: 'worker1' },
    workerName: 'Test Worker',
    status: ResultStatus.SUCCESS,
    priority: Priority.PRIORITY_MEDIUM,
    enqueueTime: '0',
    runAfterTime: '0',
    startTime: '0',
    endTime: '0',
    retried: 0,
    maxRetry: 0,
    args: new TextEncoder().encode('{"plain":"args"}'),
    output: { items: new TextEncoder().encode('plain output') },
};

describe('JobResultDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // WorkerService.Find returns Ok({ data: undefined }) for a deleted worker
    // — this is the realistic shape of the bug report.
    it('renders raw payload and banner when worker.find resolves with no data', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.find as any).mockResolvedValue({
            data: { id: { value: 'result1' }, data: baseResultData },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.find as any).mockResolvedValue({ data: undefined });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.find as any).mockResolvedValue({ data: undefined });

        renderWithProviders('1');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Worker / Runner not found');
        });
        expect(screen.getByText(/"plain": "args"/)).toBeInTheDocument();
        expect(screen.getByText('plain output')).toBeInTheDocument();
    });

    // Defense-in-depth path: even if worker.find rejects, the page still
    // renders raw payloads behind the banner.
    it('renders banner when worker.find rejects with WorkerNotFound', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.find as any).mockResolvedValue({
            data: { id: { value: 'result1' }, data: baseResultData },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.find as any).mockRejectedValue(
            new ClientError('/jobworkerp.service.WorkerService/Find', Status.INVALID_ARGUMENT, 'Worker not found'),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.find as any).mockResolvedValue({ data: undefined });

        renderWithProviders('1');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Worker / Runner not found');
        });
    });

    it('does not show banner on the happy path', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.find as any).mockResolvedValue({
            data: { id: { value: 'result1' }, data: baseResultData },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.find as any).mockResolvedValue({
            data: {
                id: { value: 'worker1' },
                data: { name: 'Test Worker', runnerId: { value: 'runner1' } },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.find as any).mockResolvedValue({
            data: {
                id: { value: 'runner1' },
                data: { name: 'TestRunner', methodProtoMap: { schemas: {} } },
            },
        });

        renderWithProviders('1');

        await waitFor(() => {
            expect(screen.getByText('Job Result Details')).toBeInTheDocument();
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

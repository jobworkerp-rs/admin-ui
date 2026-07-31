import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientError, Status } from 'nice-grpc-web';
import JobDetail from '@/pages/jobs/detail';
import { jobClient, jobStatusClient, jobResultClient, workerClient, runnerClient } from '@/lib/client';

vi.mock('@/lib/client', () => ({
    jobClient: { find: vi.fn() },
    jobStatusClient: { find: vi.fn() },
    jobResultClient: { find: vi.fn() },
    workerClient: { find: vi.fn() },
    runnerClient: { find: vi.fn() },
}));

vi.mock('@/hooks/use-toast', () => ({
    toast: vi.fn(),
    useToast: () => ({ toast: vi.fn() }),
}));

const renderWithProviders = (id: string) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/jobs/${id}`]}>
                <Routes>
                    <Route path="/jobs/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe('JobDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the page with a banner when worker is deleted (jobResult fetch fails)', async () => {
        const jobData = {
            workerId: { value: 'worker1' },
            args: new TextEncoder().encode('{"raw":"args"}'),
            enqueueTime: '0',
            using: 'run',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobClient.find as any).mockResolvedValue({
            data: { id: { value: 'job1' }, data: jobData },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobStatusClient.find as any).mockResolvedValue({ status: undefined });
        // jobResultClient.find fails with WorkerNotFound — useJob should swallow and continue.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.find as any).mockRejectedValue(
            new ClientError('/jobworkerp.service.JobResultService/Find', Status.INVALID_ARGUMENT, 'Worker not found'),
        );
        // workerClient.find returns Ok({ data: undefined }) for a deleted worker
        // (the server doesn't error on missing workers).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.find as any).mockResolvedValue({ data: undefined });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.find as any).mockResolvedValue({ data: undefined });

        renderWithProviders('job1');

        // Page renders (no whole-page error)
        await waitFor(() => {
            expect(screen.getByText('Job Detail')).toBeInTheDocument();
        });
        // Warning banner is shown
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Worker / Runner not found');
        });
        // Args render as raw text via TextDecoder fallback
        expect(screen.getByText(/"raw": "args"/)).toBeInTheDocument();
    });

    it('does not show banner when worker resolves', async () => {
        const jobData = {
            workerId: { value: 'worker1' },
            args: new TextEncoder().encode('{}'),
            enqueueTime: '0',
            using: 'run',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobClient.find as any).mockResolvedValue({
            data: { id: { value: 'job1' }, data: jobData },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobStatusClient.find as any).mockResolvedValue({ status: undefined });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.find as any).mockResolvedValue({ data: undefined });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.find as any).mockResolvedValue({
            data: { id: { value: 'worker1' }, data: { name: 'w', runnerId: { value: 'r1' } } },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.find as any).mockResolvedValue({
            data: { id: { value: 'r1' }, data: { name: 'R', methodProtoMap: { schemas: {} } } },
        });

        renderWithProviders('job1');

        await waitFor(() => {
            expect(screen.getByText('Job Detail')).toBeInTheDocument();
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

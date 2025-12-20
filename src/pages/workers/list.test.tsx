import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkerList from '@/pages/workers/list';
import { workerClient, runnerClient } from '@/lib/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock client
vi.mock('@/lib/client', () => ({
  workerClient: {
    findList: vi.fn(),
    delete: vi.fn(),
  },
  runnerClient: {
    findListBy: vi.fn(),
  }
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

// Mock components
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithProviders = (ui: React.ReactNode) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {ui}
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('WorkerList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders list of workers with runner names', async () => {
         const mockWorkers = [
            { id: { value: 'w1' }, data: { name: 'Worker 1', runnerId: { value: 'r1' }, description: 'Desc W1' } },
            { id: { value: 'w2' }, data: { name: 'Worker 2', runnerId: { value: 'r2' }, description: 'Desc W2' } },
        ];

        // Based on recent fix attempt, I used optional chaining runner?.data?.name.
        // If Runner has `name` directly, that fix might be wrong or right depending on structure.
        // Let's assume for test that I need to match what the component expects.
        // If the component uses runner.data.name, I should provide data.name.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            for (const worker of mockWorkers) {
                yield worker;
            }
        });

        // Mock runners for name lookup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.findListBy as any).mockImplementation(async function* () {
             yield { id: { value: 'r1' }, data: { name: 'Runner One' } }; // If structure is id/data
             yield { id: { value: 'r2' }, data: { name: 'Runner Two' } };
        });

        renderWithProviders(<WorkerList />);

        await waitFor(() => {
            expect(screen.getByText('Worker 1')).toBeInTheDocument();
            expect(screen.getByText('Worker 2')).toBeInTheDocument();
            expect(screen.getByText('Runner One')).toBeInTheDocument();
            expect(screen.getByText('Runner Two')).toBeInTheDocument();
        });
    });

    it('handles worker deletion', async () => {
        const mockWorkers = [
            { id: { value: 'w1' }, data: { name: 'Worker to Delete', runnerId: { value: 'r1' } } },
        ];
        let currentWorkers = [...mockWorkers];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            for (const worker of currentWorkers) {
                yield worker;
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.findListBy as any).mockImplementation(async function* () {
             yield { id: { value: 'r1' }, data: { name: 'Runner One' } };
        });

        // Mock delete success and empty the list
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.delete as any).mockImplementation(async () => {
             currentWorkers = [];
             return {};
        });

        renderWithProviders(<WorkerList />);

        await waitFor(() => {
            expect(screen.getByText('Worker to Delete')).toBeInTheDocument();
        });

        // With our mock, the content is rendered directly, so we can find 'Delete' button.
        const deleteButton = screen.getByText('Delete');
        deleteButton.click();

        // Expect Alert Dialog to appear
        await waitFor(() => {
            expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
        });

        // Click Delete
        const dialog = screen.getByTestId('alert-dialog');
        const continueButton = within(dialog).getByRole('button', { name: 'Delete' });
        continueButton.click();

        await waitFor(() => {
            expect(workerClient.delete).toHaveBeenCalledWith({ value: 'w1' });
            expect(screen.queryByText('Worker to Delete')).not.toBeInTheDocument();
            expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
        });

        // Ensure refetch has happened (initial + after delete)
        await waitFor(() => {
            expect(workerClient.findList).toHaveBeenCalledTimes(2);
        });
    });
});

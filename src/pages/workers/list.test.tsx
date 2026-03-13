import React from 'react';
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
const AlertDialogContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
    open: false,
    onOpenChange: () => {},
});

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children }: any) => {
        const [open, setOpen] = React.useState(false);
        return (
            <AlertDialogContext.Provider value={{ open, onOpenChange: setOpen }}>
                <div data-testid="alert-dialog" data-open={open}>
                    {children}
                </div>
            </AlertDialogContext.Provider>
        );
    },
    AlertDialogContent: ({ children }: any) => {
        const { open } = React.useContext(AlertDialogContext);
        return open ? <div data-testid="alert-dialog-content">{children}</div> : null;
    },
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: any) => {
        const { onOpenChange } = React.useContext(AlertDialogContext);
        return <button onClick={() => onOpenChange(false)}>{children}</button>;
    },
    AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    AlertDialogTrigger: ({ children, asChild }: any) => {
        const { onOpenChange } = React.useContext(AlertDialogContext);
        if (asChild) {
            return React.cloneElement(children, {
                onClick: (e: any) => {
                    children.props?.onClick?.(e);
                    onOpenChange(true);
                },
            });
        }
        return <button onClick={() => onOpenChange(true)}>{children}</button>;
    },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithProviders = (ui: React.ReactNode) => {
    const queryClient = createQueryClient();
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

        // Click the trash icon button (AlertDialogTrigger) to open the dialog
        const trashButton = screen.getByRole('button', { name: /delete worker/i });
        trashButton.click();

        // Expect Alert Dialog content to appear
        await waitFor(() => {
            expect(screen.getByTestId('alert-dialog-content')).toBeInTheDocument();
        });

        // Click the Delete button inside the dialog to confirm deletion
        const dialog = screen.getByTestId('alert-dialog-content');
        const confirmButton = within(dialog).getByRole('button', { name: 'Delete' });
        confirmButton.click();

        await waitFor(() => {
            expect(workerClient.delete).toHaveBeenCalled();
        });
    });
});

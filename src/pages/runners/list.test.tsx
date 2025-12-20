import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RunnerList from '@/pages/runners/list';
import { runnerClient } from '@/lib/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock client
vi.mock('@/lib/client', () => ({
  runnerClient: {
    findListBy: vi.fn(),
    delete: vi.fn(),
  },
  workerClient: {
    countBy: vi.fn().mockResolvedValue({ total: "5" }) // Mock worker count
  }
}));

// Mock components that might cause issues or aren't focus of this test
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children, asChild }: any) => asChild ? children : <button>{children}</button>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
    AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    AlertDialogTrigger: ({ children, asChild }: any) => asChild ? children : <button>{children}</button>,
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

describe('RunnerList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders loading state', () => {
         // Mock generic async iterator for findListBy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, require-yield
        (runnerClient.findListBy as any).mockImplementation(async function* () {
             // yield nothing initially to check loading, or just delay?
             // Actually React Query will start in loading state.
             await new Promise(resolve => setTimeout(resolve, 100));
        });

        renderWithProviders(<RunnerList />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders list of runners', async () => {
         const mockRunners = [
            { id: { value: '1' }, data: { name: 'Runner 1', runnerType: 1, description: 'Desc 1' } },
            { id: { value: '2' }, data: { name: 'Runner 2', runnerType: 2, description: 'Desc 2' } },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.findListBy as any).mockImplementation(async function* () {
            for (const runner of mockRunners) {
                yield runner;
            }
        });

        renderWithProviders(<RunnerList />);

        await waitFor(() => {
            expect(screen.getByText('Runner 1')).toBeInTheDocument();
            expect(screen.getByText('Runner 2')).toBeInTheDocument();
        });
    });

     it('renders empty state', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runnerClient.findListBy as any).mockImplementation(async function* () {
             // yield nothing
        });

        renderWithProviders(<RunnerList />);

        await waitFor(() => {
            expect(screen.getByText('No runners found.')).toBeInTheDocument();
        });
    });
});

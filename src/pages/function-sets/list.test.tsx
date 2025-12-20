import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FunctionSetList from '@/pages/function-sets/list';
import { functionSetClient } from '@/lib/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock client
vi.mock('@/lib/client', () => ({
  functionSetClient: {
    findList: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock components
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children }: any) => <div>{children}</div>,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
    AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    AlertDialogTrigger: ({ children }: any) => <button>{children}</button>,
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

describe('FunctionSetList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders list of function sets', async () => {
         const mockSets = [
            { id: { value: 'fs1' }, data: { name: 'Set 1', description: 'Desc 1', category: 'Cat 1' } },
            { id: { value: 'fs2' }, data: { name: 'Set 2', description: 'Desc 2', category: 'Cat 2' } },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (functionSetClient.findList as any).mockImplementation(async function* () {
            for (const set of mockSets) {
                yield set;
            }
        });

        renderWithProviders(<FunctionSetList />);

        await waitFor(() => {
            expect(screen.getByText('Set 1')).toBeInTheDocument();
            expect(screen.getByText('Set 2')).toBeInTheDocument();
            expect(screen.getByText('Cat 1')).toBeInTheDocument();
        });
    });

    it('renders empty state', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (functionSetClient.findList as any).mockImplementation(async function* () {
             // yield nothing
        });

        renderWithProviders(<FunctionSetList />);

        await waitFor(() => {
            expect(screen.getByText('No function sets found.')).toBeInTheDocument();
        });
    });
});

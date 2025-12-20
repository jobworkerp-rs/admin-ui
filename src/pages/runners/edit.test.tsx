import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RunnerEdit from '@/pages/runners/edit';
import { runnerClient } from '@/lib/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock client
vi.mock('@/lib/client', () => ({
  runnerClient: {
    find: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: { value: '123' } }),
  }
}));

// Mock generic components
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@/components/ui/select', () => ({
    Select: ({ onValueChange, children }: any) => <div data-testid="select" onClick={() => onValueChange(1)}>{children}</div>,
    SelectTrigger: ({ children }: any) => <button>{children}</button>,
    SelectValue: () => <span>Value</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children }: any) => <div>{children}</div>,
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
                 <Routes>
                    <Route path="/" element={ui} />
                    <Route path="/:id" element={ui} />
                 </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('RunnerEdit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders create form', () => {
        renderWithProviders(<RunnerEdit />);
        expect(screen.getByText('New Runner')).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    it('submits create form', async () => {
        renderWithProviders(<RunnerEdit />);

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Runner' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'My Description' } });
        // Simulating Select is tricky via mocks, but we mocked the click to trigger onValueChange(1)
        fireEvent.click(screen.getByTestId('select'));

        fireEvent.click(screen.getByText('Create'));

        await waitFor(() => {
            expect(runnerClient.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Runner',
                description: 'My Description',
                runnerType: 1
            }));
        });
    });
});

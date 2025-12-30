import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobResultList from '@/pages/results/list';
import { jobResultClient, workerClient } from '@/lib/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultStatus, Priority } from '@/lib/grpc/jobworkerp/data/common';

// Mock clients
vi.mock('@/lib/client', () => ({
    jobResultClient: {
        findListBy: vi.fn(),
        deleteBulk: vi.fn(),
    },
    workerClient: {
        findList: vi.fn(),
    },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

// Mock UI components
/* eslint-disable @typescript-eslint/no-explicit-any */
const AlertDialogContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
    open: false,
    onOpenChange: () => {},
});

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open, onOpenChange }: any) => (
        <AlertDialogContext.Provider value={{ open, onOpenChange }}>
            <div data-testid="alert-dialog-wrapper" data-open={open}>
                {children}
            </div>
        </AlertDialogContext.Provider>
    ),
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

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="select" data-value={value}>
            {typeof children === 'function' ? children({ onValueChange }) : children}
        </div>
    ),
    SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: any) => <div data-testid={`select-item-${value}`}>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
    Calendar: () => <div data-testid="calendar">Calendar</div>,
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

describe('JobResultList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders list of job results', async () => {
        const mockJobResults = [
            {
                id: { value: 'result1' },
                data: {
                    jobId: { value: 'job1' },
                    workerId: { value: 'worker1' },
                    status: ResultStatus.SUCCESS,
                    priority: Priority.PRIORITY_MEDIUM,
                    endTime: '1703980800000',
                },
            },
            {
                id: { value: 'result2' },
                data: {
                    jobId: { value: 'job2' },
                    workerId: { value: 'worker1' },
                    status: ResultStatus.FATAL_ERROR,
                    priority: Priority.PRIORITY_HIGH,
                    endTime: '1703984400000',
                },
            },
        ];

        const mockWorkers = [
            { id: { value: 'worker1' }, data: { name: 'Test Worker' } },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            for (const result of mockJobResults) {
                yield result;
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            for (const worker of mockWorkers) {
                yield worker;
            }
        });

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('job1')).toBeInTheDocument();
            expect(screen.getByText('job2')).toBeInTheDocument();
        });

        // Check status badges are rendered (use getAllByText since "Success" appears in both filter dropdown and table)
        await waitFor(() => {
            const successElements = screen.getAllByText('Success');
            expect(successElements.length).toBeGreaterThanOrEqual(1);
            const errorElements = screen.getAllByText('Error');
            expect(errorElements.length).toBeGreaterThanOrEqual(1);
        });

        // Check worker names are displayed in table cells (use getAllByText for multiple occurrences)
        const workerCells = screen.getAllByText('Test Worker');
        expect(workerCells.length).toBeGreaterThanOrEqual(2); // In filter dropdown and table rows
    });

    it('renders empty state', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            // yield nothing
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            // yield nothing
        });

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('No results found.')).toBeInTheDocument();
        });
    });

    it('handles bulk delete successfully', async () => {
        const mockJobResults = [
            {
                id: { value: 'result1' },
                data: {
                    jobId: { value: 'job1' },
                    workerId: { value: 'worker1' },
                    status: ResultStatus.SUCCESS,
                    priority: Priority.PRIORITY_MEDIUM,
                    endTime: '1703980800000',
                },
            },
        ];

        let resultsList = [...mockJobResults];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            for (const result of resultsList) {
                yield result;
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            yield { id: { value: 'worker1' }, data: { name: 'Test Worker' } };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.deleteBulk as any).mockImplementation(async () => {
            resultsList = [];
            return { deletedCount: '1' };
        });

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('job1')).toBeInTheDocument();
        });

        // Click Bulk Delete button
        const bulkDeleteButton = screen.getByRole('button', { name: /Bulk Delete/i });
        bulkDeleteButton.click();

        // Dialog should appear (check data-open attribute changes to true)
        await waitFor(() => {
            const dialogWrapper = screen.getByTestId('alert-dialog-wrapper');
            expect(dialogWrapper).toHaveAttribute('data-open', 'true');
        });

        // Click Confirm Delete in dialog
        const dialogContent = screen.getByTestId('alert-dialog-content');
        const confirmButton = within(dialogContent).getByRole('button', { name: 'Confirm Delete' });
        confirmButton.click();

        // Verify deleteBulk was called
        await waitFor(() => {
            expect(jobResultClient.deleteBulk).toHaveBeenCalled();
        });

        // Verify success toast
        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bulk Delete Successful',
                })
            );
        });
    });

    it('shows error toast on bulk delete failure', async () => {
        const mockJobResults = [
            {
                id: { value: 'result1' },
                data: {
                    jobId: { value: 'job1' },
                    workerId: { value: 'worker1' },
                    status: ResultStatus.SUCCESS,
                    priority: Priority.PRIORITY_MEDIUM,
                    endTime: '1703980800000',
                },
            },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            for (const result of mockJobResults) {
                yield result;
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            yield { id: { value: 'worker1' }, data: { name: 'Test Worker' } };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.deleteBulk as any).mockRejectedValue(new Error('Delete failed'));

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('job1')).toBeInTheDocument();
        });

        // Click Bulk Delete button
        const bulkDeleteButton = screen.getByRole('button', { name: /Bulk Delete/i });
        bulkDeleteButton.click();

        // Dialog should appear (check data-open attribute changes to true)
        await waitFor(() => {
            const dialogWrapper = screen.getByTestId('alert-dialog-wrapper');
            expect(dialogWrapper).toHaveAttribute('data-open', 'true');
        });

        // Click Confirm Delete in dialog
        const dialogContent = screen.getByTestId('alert-dialog-content');
        const confirmButton = within(dialogContent).getByRole('button', { name: 'Confirm Delete' });
        confirmButton.click();

        // Verify error toast
        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Bulk Delete Failed',
                    variant: 'destructive',
                })
            );
        });
    });

    it('displays page title and description', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            // yield nothing
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            // yield nothing
        });

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('Job Results')).toBeInTheDocument();
            expect(screen.getByText('View history and results of completed jobs.')).toBeInTheDocument();
        });
    });

    it('displays filter card', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobResultClient.findListBy as any).mockImplementation(async function* () {
            // yield nothing
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workerClient.findList as any).mockImplementation(async function* () {
            // yield nothing
        });

        renderWithProviders(<JobResultList />);

        await waitFor(() => {
            expect(screen.getByText('Filter Results')).toBeInTheDocument();
            expect(screen.getByText('Filter by worker, status, priority, end time, or unique key.')).toBeInTheDocument();
        });
    });
});

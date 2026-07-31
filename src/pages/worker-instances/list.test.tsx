import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientError, Status } from 'nice-grpc-web';
import WorkerInstanceList from './list';
import { workerInstanceClient } from '@/lib/client';

vi.mock('@/lib/client', () => ({
  workerInstanceClient: {
    count: vi.fn(),
    findChannelList: vi.fn(),
    findList: vi.fn(),
  },
}));

const activeInstance = {
  id: { value: '101' },
  data: {
    ipAddress: '192.0.2.10',
    hostname: 'active-host',
    registeredAt: '1700000000000',
    lastHeartbeat: '1700000005000',
    rdbStatusIndexRecoveryVersion: 1,
    channels: [{ name: '', concurrency: 4 }],
  },
};

const inactiveInstance = {
  id: { value: '102' },
  data: {
    ipAddress: '192.0.2.11',
    hostname: undefined,
    registeredAt: 'invalid',
    lastHeartbeat: '0',
    rdbStatusIndexRecoveryVersion: 0,
    channels: [{ name: 'batch', concurrency: 2 }],
  },
};

async function* stream<T>(items: T[]) {
  for (const item of items) {
    yield item;
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WorkerInstanceList />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('WorkerInstanceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows active instances by default and sends the default-channel value as an empty string', async () => {
    vi.mocked(workerInstanceClient.count).mockResolvedValue({ total: '2', active: '1' });
    vi.mocked(workerInstanceClient.findChannelList).mockResolvedValue({
      channels: [{ name: '[default]', totalConcurrency: 4, activeInstances: 1, workerCount: '1' }],
    });
    vi.mocked(workerInstanceClient.findList).mockImplementation(() => stream([activeInstance]));

    renderPage();

    await waitFor(() => expect(screen.getByText('active-host')).toBeInTheDocument());
    expect(screen.queryByText('192.0.2.11')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: 'Channel' }));
    fireEvent.click(screen.getByRole('option', { name: '[default]' }));

    await waitFor(() => {
      expect(workerInstanceClient.findList).toHaveBeenLastCalledWith({
        activeOnly: true,
        channel: '',
      });
    });
  });

  it('derives inactive status from the active stream when inactive instances are included', async () => {
    vi.mocked(workerInstanceClient.count).mockResolvedValue({ total: '2', active: '1' });
    vi.mocked(workerInstanceClient.findChannelList).mockResolvedValue({ channels: [] });
    vi.mocked(workerInstanceClient.findList).mockImplementation((request) =>
      stream(request.activeOnly ? [activeInstance] : [activeInstance, inactiveInstance]),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText('active-host')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include inactive instances' }));

    await waitFor(() => expect(screen.getByText('192.0.2.11')).toBeInTheDocument());
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Not participating')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows a retry action after a non-retryable error', async () => {
    vi.mocked(workerInstanceClient.count).mockRejectedValue(
      new ClientError('/jobworkerp.service.WorkerInstanceService/Count', Status.INTERNAL, 'broken'),
    );
    vi.mocked(workerInstanceClient.findChannelList).mockResolvedValue({ channels: [] });
    vi.mocked(workerInstanceClient.findList).mockImplementation(() => stream([]));

    renderPage();

    await waitFor(() => expect(screen.getByText('Failed to load worker instances.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(workerInstanceClient.count).toHaveBeenCalledTimes(2));
  });
});

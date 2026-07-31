import { expect, test } from '@playwright/test';
import { routeGrpc, routeGrpcStream } from './mock-grpc';
import { WorkerInstance } from '../../src/lib/grpc/jobworkerp/data/worker_instance';
import {
  CountInstanceResponse,
  FindInstanceChannelListResponse,
} from '../../src/lib/grpc/jobworkerp/service/worker_instance';

test.use({ viewport: { width: 768, height: 720 } });

test('shows worker instances from WorkerInstanceService', async ({ page }) => {
  await routeGrpc(
    page,
    'jobworkerp.service.WorkerInstanceService',
    'Count',
    { total: '1', active: '1' },
    CountInstanceResponse,
  );
  await routeGrpc(
    page,
    'jobworkerp.service.WorkerInstanceService',
    'FindChannelList',
    {
      channels: [{ name: '[default]', totalConcurrency: 4, activeInstances: 1, workerCount: '1' }],
    },
    FindInstanceChannelListResponse,
  );
  await routeGrpcStream(
    page,
    'jobworkerp.service.WorkerInstanceService',
    'FindList',
    [{
      id: { value: '101' },
      data: {
        ipAddress: '192.0.2.10',
        hostname: 'worker-host-with-a-long-name-that-must-wrap-within-the-available-width',
        registeredAt: '1700000000000',
        lastHeartbeat: '1700000005000',
        rdbStatusIndexRecoveryVersion: 1,
        channels: [
          { name: '', concurrency: 4 },
          { name: 'very-long-channel-name-that-must-wrap-within-the-available-width', concurrency: 2 },
        ],
      },
    }],
    WorkerInstance,
  );

  await page.goto('/worker-instances');

  await expect(page.getByRole('heading', { name: 'Worker Instances' })).toBeVisible();
  await expect(page.getByText('worker-host-with-a-long-name-that-must-wrap-within-the-available-width')).toBeVisible();
  await expect(page.getByText('1 / 1')).toBeVisible();
  await expect(page.getByText('Participating')).toBeVisible();
  const summaryCard = page.locator('[data-slot="card"]').filter({ hasText: 'Active / total registered instances' });
  const channelCapacityCard = page.locator('[data-slot="card"]').filter({ hasText: 'Channel Capacity' });
  const [summaryBox, channelCapacityBox] = await Promise.all([summaryCard.boundingBox(), channelCapacityCard.boundingBox()]);
  expect(summaryBox).not.toBeNull();
  expect(channelCapacityBox).not.toBeNull();
  expect(channelCapacityBox!.y).toBeGreaterThan(summaryBox!.y);
  const hasNoHorizontalOverflow = await page
    .locator('[data-slot="table-container"]')
    .evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(hasNoHorizontalOverflow).toBe(true);
});

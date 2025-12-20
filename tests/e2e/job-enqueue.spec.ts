import { test, expect } from '@playwright/test';
import { routeGrpcStream, routeGrpc } from './mock-grpc';
import { Worker } from '../../src/lib/grpc/jobworkerp/data/worker';
import { CreateJobResponse } from '../../src/lib/grpc/jobworkerp/service/job';
import { OptionalRunnerResponse } from '../../src/lib/grpc/jobworkerp/service/runner';

test.describe('Job Enqueue', () => {
    test.beforeEach(async () => {
        // Common mocks?
    });

    test('should enqueue a new job with dynamic arguments', async ({ page }) => {
        // 1. Setup Mock Data
        const mockRunner = {
            id: { value: "1" },
            data: {
                name: "Test Runner",
                runnerType: 1, // GRPC
                // methodProtoMap with argsProto
                methodProtoMap: {
                    schemas: {
                        "default": {
                            argsProto: `syntax = "proto3"; message Args { string key = 1; int32 count = 2; }`,
                            resultProto: "",
                        }
                    }
                }
            }
        };

        const mockWorker = {
            id: { value: "10" },
            data: {
                name: "Test Worker",
                runnerId: { value: "1" },
                description: "Worker for testing jobs"
            }
        };

        // 2. Mock Workers List
        await routeGrpcStream(page, 'jobworkerp.service.WorkerService', 'FindList', [mockWorker], Worker);

        // 3. Mock Runner Find (for dynamic form)
        await routeGrpc(page, 'jobworkerp.service.RunnerService', 'Find', { data: mockRunner }, OptionalRunnerResponse);

        // 4. Mock Job Enqueue
        await routeGrpc(page, 'jobworkerp.service.JobService', 'Enqueue', { id: { value: "1001" } }, CreateJobResponse);

        // 5. Navigate
        await page.goto('/jobs/new');

        // 6. Select Worker
        await page.getByText('Select a worker').click();
        await page.getByRole('option', { name: "Test Worker" }).click();


        // 7. Verify Dynamic Form Appears (Auto-selected method 'default')
        // Method select should be visible and populated
        // The component renders "Method (Using)" label if > 0 methods.
        await expect(page.getByText('Method (Using)')).toBeVisible();
        await expect(page.getByText('default')).toBeVisible(); // Selected value in trigger or in content?
        // If auto-selected, the trigger should show "default" or the SelectValue.

        // Wait for dynamic args form
        await expect(page.getByText('Arguments')).toBeVisible();
        await expect(page.locator('input[name="key"]')).toBeVisible();
        await expect(page.locator('input[name="count"]')).toBeVisible();

        // 8. Fill Form
        await page.locator('input[name="key"]').fill('test-key-val');
        await page.locator('input[name="count"]').fill('123');

        // Priority
        await page.getByText('Normal (0)').click(); // Default is Normal (0)
        await page.getByRole('option', { name: 'High (1)' }).click();

        // 9. Submit
        await page.getByRole('button', { name: 'Enqueue Job' }).click();

        // 10. Verify Success (Toast check might be flaky, check Redirect)
        await expect(page).toHaveURL(/\/jobs$/);
    });
});


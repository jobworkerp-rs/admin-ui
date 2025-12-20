import { test, expect } from '@playwright/test';
import { routeGrpcStream, routeGrpc } from './mock-grpc';
import { Worker as WorkerMessage } from '../../src/lib/grpc/jobworkerp/data/worker';
import { Runner } from '../../src/lib/grpc/jobworkerp/data/runner';
import { CreateWorkerResponse, OptionalWorkerResponse, FindChannelListResponse } from '../../src/lib/grpc/jobworkerp/service/worker';
import { CountResponse } from '../../src/lib/grpc/jobworkerp/service/common';

test.describe('Worker Management', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Worker Count (called by List)
        await routeGrpc(page, 'jobworkerp.service.WorkerService', 'CountBy', { total: "0" }, CountResponse);
        // Mock FindChannelList
        await routeGrpc(page, 'jobworkerp.service.WorkerService', 'FindChannelList', {
            channels: [
                { name: 'default' },
                { name: 'test-channel' }
            ]
        }, FindChannelListResponse);
    });

    test('should list workers and allow creating a new one with dynamic settings', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        // 1. Visit Worker List - Mock Empty
        await routeGrpcStream(page, 'jobworkerp.service.WorkerService', 'FindList', [], WorkerMessage);

        // Mock Runners (for list if needed, or create page)
        // We need at least one runner for the create page
        const mockRunner = {
            id: { value: "1" },
            data: {
                name: "Mock Runner",
                description: "For Testing",
                runnerType: 1, // GRPC
                // Simple proto definition for dynamic form test
                runnerSettingsProto: `syntax = "proto3"; message Settings { string api_key = 1; int32 timeout = 2; } `,
                definition: "",
                methodProtoMap: { schemas: {} }
            }
        };

        // Mock FindList for RunnerService
        await routeGrpcStream(page, 'jobworkerp.service.RunnerService', 'FindListBy', [mockRunner], Runner);

        await page.goto('/workers');
        // Initial state: empty list
        await expect(page.getByText('No workers found')).toBeVisible();

        // 2. Click Create
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page).toHaveURL(/\/workers\/new/);

        // 3. Fill Form
        await page.getByLabel('Name').fill('New Worker');

        // Select Runner (combobox)
        await expect(page.getByText('Select a runner')).toBeVisible();

        // Open combobox
        await page.getByRole('combobox', { name: 'Runner' }).click(); // "Runner" from label
        await page.getByRole('option', { name: 'Mock Runner' }).click();

        // Wait for dynamic form fields to appear
        await expect(page.getByText('Runner Settings')).toBeVisible();

        // Fill dynamic fields
        await page.locator('#apiKey').fill('secret-key');
        await page.locator('#timeout').fill('1000');

        // Select Channel
        await page.getByText('Select a channel').click();
        // Wait for options to appear
        await expect(page.getByRole('option', { name: 'test-channel' })).toBeVisible();
        await page.getByRole('option', { name: 'test-channel' }).click();

        // Verify other fields
        await page.getByLabel('Interval (ms)').fill('5000'); // Periodic
        await page.getByRole('checkbox', { name: 'Store Success' }).check();

        // 4. Submit Create
        // Mock Create Response
        await routeGrpc(page, 'jobworkerp.service.WorkerService', 'Create', { id: { value: "101" } }, CreateWorkerResponse);

        // Mock List update (after redirect)
        const createdWorker = {
            id: { value: "101" },
            data: {
                name: "New Worker",
                runnerId: { value: "1" },
                periodicInterval: 5000,
                channel: "test-channel",
                storeSuccess: true,
                runnerSettings: new Uint8Array(), // Simplified
            }
        };
        await routeGrpcStream(page, 'jobworkerp.service.WorkerService', 'FindList', [createdWorker], WorkerMessage);

        await page.getByRole('button', { name: 'Create' }).click();

        // 5. Verify Redirect and List
        await expect(page).toHaveURL(/\/workers$/);
        await expect(page.getByText('New Worker')).toBeVisible();

    });

    test('should load existing worker and pre-fill form fields', async ({ page }) => {
        page.on('console', msg => console.log('EDIT_TEST LOG:', msg.text())); // Debug logging

        // Mock Runner (Same as above)
        const mockRunner = {
            id: { value: "1" },
            data: {
                name: "Mock Runner",
                description: "For Testing",
                runnerType: 1,
                runnerSettingsProto: `syntax = "proto3"; message Settings { string api_key = 1; int32 timeout = 2; } `,
                definition: "",
                methodProtoMap: { schemas: {} }
            }
        };
        await routeGrpcStream(page, 'jobworkerp.service.RunnerService', 'FindListBy', [mockRunner], Runner);

        // Mock Worker for Edit
        const existingWorker = {
            id: { value: "102" },
            data: {
                name: "Editing Worker",
                runnerId: { value: "1" },
                periodicInterval: 3000,
                channel: "test-channel",
                responseType: 1, // Direct Response
                queueType: 2, // DB Only
                runnerSettings: new Uint8Array(), // Empty for simplicity
            }
        };

        // Mock Find (Unary)
        await routeGrpc(page, 'jobworkerp.service.WorkerService', 'Find', { data: existingWorker }, OptionalWorkerResponse);

        await page.goto('/workers/102');

        // Wait for data to load (allow React Query to finish)
        await page.waitForTimeout(2000);

        // Inject a log to confirm we're on the right page
        await page.evaluate(() => console.log("===== AFTER NAVIGATION TO /workers/102 ====="));

        // Check Form Values - use getByLabel for Name which is more reliable
        await expect(page.getByLabel('Name')).toHaveValue('Editing Worker');

        // Check Form Values
        await expect(page.locator('input[name="name"]')).toHaveValue('Editing Worker');

        // Check Runner (Combobox value) - Harder to check value directly, usually check text
        // For Shadcn select/combobox, usually the trigger contains the selected text.
        await expect(page.getByRole('combobox', { name: "Runner" })).toContainText("Mock Runner");

        // Check Channel
        // Check Channel - use getByLabel to find the combobox trigger specifically
        await expect(page.getByRole('combobox').filter({ hasText: 'test-channel' })).toBeVisible();

        // Check Response Type
        // We need to check if "Direct Response" is selected.
        // The SelectTrigger for Response Type doesn't have a unique label/role easily accessible unless we add one or rely on order.
        // In the code: FormLabel "Response Type" -> Select. 
        // We can try getting by Label if we fixed accessibility, or get the text inside the select trigger.
        // Note: Response Type select trigger doesn't have a specific aria-label in edit.tsx, just FormItem/FormLabel.
        // The generic `Select` component doesn't automatically associate label without `id` passed to Trigger unless FormField does it. 
        // Shadcn Form does handle IDs.

        // Let's assume FormField connects Label and Control (it does).
        // So `getByLabel('Response Type')` should find the Trigger (button).
        // And it should contain "Direct Response".
        await expect(page.getByLabel('Response Type')).toContainText('Direct Response');
    });
});

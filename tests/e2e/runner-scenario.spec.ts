import { test, expect } from '@playwright/test';
import { routeGrpcStream, routeGrpc } from './mock-grpc';
import { Runner } from '../../src/lib/grpc/jobworkerp/data/runner';
import { CreateRunnerResponse, OptionalRunnerResponse } from '../../src/lib/grpc/jobworkerp/service/runner';
import { CountResponse } from '../../src/lib/grpc/jobworkerp/service/common';
// Note: importing from src in test might require tsconfig setup or using relative paths carefully.
// Playwright handles TS, but imports might rely on tsconfig paths.
// Since 'src' is aliased to '@' in vite, but playwright might not pick it up without config.
// I used relative paths '../../src/...' to be safe.

// We also need types for message encoding
// The generated TS files export objects like 'Runner', 'CreateRunnerResponse', 'CountResponse' which have 'encode' methods.

test.describe('Runner Management', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Worker Count (called by Runner List)
        // jobworkerp.service.WorkerService/CountBy
        // Since I don't have Worker Service imports here easily without digging, I'll assume 0 count for now or try to mock valid response.
        // Actually, CountResponse is in 'common'.
        await routeGrpc(page, 'jobworkerp.service.WorkerService', 'CountBy', { total: "0" }, CountResponse);
    });

    test('should list runners and allow creating a new one', async ({ page }) => {
        // 1. Visit Runner List - Mock Empty
        await routeGrpcStream(page, 'jobworkerp.service.RunnerService', 'FindListBy', [], Runner);

        await page.goto('/runners');
        await expect(page.getByText('JobWorkerp Admin')).toBeVisible();
        await expect(page.getByText('No runners found.')).toBeVisible();

        // 2. Navigation to Create
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page).toHaveURL(/\/runners\/new/);
        // 3. Fill Form
        await expect(page.getByRole('heading', { name: 'New Runner' })).toBeVisible();
        await page.getByLabel('Name').fill('E2E Test Runner');
        await page.getByLabel('Description').fill('Created via Playwright');
        // Select Runner Type (e.g., Command = 2 from enum)
        // The Select component in shadcn is a bit tricky to interact with in Playwright.
        // Needs clicking trigger then option.
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'MCP Server', exact: true }).click();

        // 4. Mock Create Response
        await routeGrpc(page, 'jobworkerp.service.RunnerService', 'Create', { id: { value: "100" } }, CreateRunnerResponse);

        // 5. Submit
        await page.getByRole('button', { name: 'Create' }).click();

        // 6. Should navigate back to list (or we might need to verify success toast/redirect)
        // After create, it usually navigates to list.
        // We should mock the list again with the new item.
        const newRunner = {
            id: { value: "100" },
            data: {
                name: "E2E Test Runner",
                description: "Created via Playwright",
                runnerType: 7, // MCP Server
                definition: "",
                runnerSettingsProto: "",
                methodProtoMap: { schemas: {} }
            }
        };
        await routeGrpcStream(page, 'jobworkerp.service.RunnerService', 'FindListBy', [newRunner], Runner);

        await expect(page).toHaveURL(/\/runners/);
        await expect(page.getByText('E2E Test Runner')).toBeVisible();
        await expect(page.getByText('Created via Playwright')).toBeVisible();
        // Worker count 0
        await expect(page.getByText('0', { exact: true })).toBeVisible(); // Worker count badge

        // 7. Verify Navigation to Details
        // Click on the name link
        // Find (id) returns OptionalRunnerResponse
        await routeGrpc(page, 'jobworkerp.service.RunnerService', 'Find', { data: newRunner }, OptionalRunnerResponse);

        await page.getByRole('button', { name: 'E2E Test Runner' }).click();

        await expect(page).toHaveURL(/\/runners\/100/);
        await expect(page.getByRole('heading', { name: 'Runner Details' })).toBeVisible();
        await expect(page.getByText('Basic Information')).toBeVisible();
        await expect(page.getByText('E2E Test Runner').first()).toBeVisible();
    });
});

import { test, expect } from '@playwright/test';
import { routeGrpcStream, routeGrpc } from './mock-grpc';
import { FunctionSet } from '../../src/lib/grpc/jobworkerp/function/data/function_set';
import { Runner } from '../../src/lib/grpc/jobworkerp/data/runner';
import { CreateFunctionSetResponse } from '../../src/lib/grpc/jobworkerp/function/service/function_set';

test.describe('Function Set Management', () => {

    test('should list function sets and navigate to create', async ({ page }) => {
        // 1. Mock List (Empty)
        await routeGrpcStream(page, 'jobworkerp.function.service.FunctionSetService', 'FindList', [], FunctionSet);

        // Mock Runner List (Global for this test) with methods
        const testRunner = {
            id: { value: "100" },
            data: {
                name: "Test Runner",
                runnerType: 1,
                methodProtoMap: {
                    schemas: {
                        "fetch": { argsProto: "", resultProto: "", outputType: 0 },
                        "run": { argsProto: "", resultProto: "", outputType: 0 }
                    }
                }
            }
        };
        await routeGrpcStream(page, 'jobworkerp.service.RunnerService', 'FindListBy', [testRunner], Runner);

        // 2. Visit List
        await page.goto('/function-sets');
        await expect(page.getByRole('heading', { name: 'Function Sets' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'No function sets found.' })).toBeVisible();

        // 3. Navigate to Create
        await page.getByRole('link', { name: 'Create New' }).click();
        await expect(page).toHaveURL(/\/function-sets\/new/);

        // 4. Fill Form
        await page.getByLabel('Name').fill('My Function Set');
        await page.getByLabel('Category').fill('1');
        await page.getByLabel('Description').fill('Test description');

        // Select a Runner using the selector
        // Click the select trigger
        await page.getByTestId('target-selector').click();
        // Select the runner
        await page.getByRole('option', { name: 'Test Runner' }).click();

        // Select 'using' method
        await page.getByText('Select Method...').click();
        await page.getByRole('option', { name: 'fetch' }).click();

        // Add Runner
        await page.getByRole('button', { name: 'Add' }).click();

        // 5. Mock Create Response
        await routeGrpc(page, 'jobworkerp.function.service.FunctionSetService', 'Create', { id: { value: "1" } }, CreateFunctionSetResponse);

        // 6. Submit
        await page.getByRole('button', { name: 'Save' }).click();

        // 7. Verify navigation or success
        // Mock list with new item
        const newSet = {
            id: { value: "1" },
            data: {
                name: "My Function Set",
                description: "Test description",
                category: 1,
                targets: []
            }
        };
        await routeGrpcStream(page, 'jobworkerp.function.service.FunctionSetService', 'FindList', [newSet], FunctionSet);

        // Playwright might not auto-navigate back if we didn't mock the mutation success handling correctly or if the app logic varies.
        // Assuming success redirects to list.
        await expect(page).toHaveURL(/\/function-sets$/);
        await expect(page.getByText('My Function Set')).toBeVisible();
        await expect(page.getByText('1', { exact: true }).first()).toBeVisible(); // Check for category "1" (or ID)
    });
});

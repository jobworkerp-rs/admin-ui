import { describe, it, expect } from 'vitest';
import { ClientError, Status } from 'nice-grpc-web';
import { isMissingEntityError, retryUnlessMissing } from './grpc-utils';

const PATH = '/jobworkerp.service.WorkerService/Find';

describe('isMissingEntityError', () => {
    it('matches NOT_FOUND regardless of details', () => {
        expect(isMissingEntityError(new ClientError(PATH, Status.NOT_FOUND, 'whatever'))).toBe(true);
    });

    it('matches INVALID_ARGUMENT only when details indicates missing worker/runner', () => {
        expect(
            isMissingEntityError(new ClientError(PATH, Status.INVALID_ARGUMENT, 'Worker not found')),
        ).toBe(true);
        expect(
            isMissingEntityError(new ClientError(PATH, Status.INVALID_ARGUMENT, 'Runner not found')),
        ).toBe(true);
    });

    it('does NOT match generic INVALID_ARGUMENT (e.g. validation errors)', () => {
        expect(
            isMissingEntityError(new ClientError(PATH, Status.INVALID_ARGUMENT, 'priority must be > 0')),
        ).toBe(false);
        expect(
            isMissingEntityError(new ClientError(PATH, Status.INVALID_ARGUMENT, '')),
        ).toBe(false);
    });

    it('does NOT match other status codes or non-ClientError values', () => {
        expect(isMissingEntityError(new ClientError(PATH, Status.UNAVAILABLE, 'down'))).toBe(false);
        expect(isMissingEntityError(new Error('boom'))).toBe(false);
        expect(isMissingEntityError(undefined)).toBe(false);
    });
});

describe('retryUnlessMissing', () => {
    it('skips retries on missing-entity errors', () => {
        const err = new ClientError(PATH, Status.INVALID_ARGUMENT, 'Worker not found');
        expect(retryUnlessMissing(0, err)).toBe(false);
    });

    it('retries up to 3 times for transient errors', () => {
        const err = new ClientError(PATH, Status.UNAVAILABLE, 'try again');
        expect(retryUnlessMissing(0, err)).toBe(true);
        expect(retryUnlessMissing(2, err)).toBe(true);
        expect(retryUnlessMissing(3, err)).toBe(false);
    });
});

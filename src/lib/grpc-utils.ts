import { ClientError, Status } from 'nice-grpc-web';

// The server maps `JobWorkerError::WorkerNotFound` to INVALID_ARGUMENT with a
// fixed details string, while plain validation errors share the same code.
// Match the specific WorkerNotFound shape so we don't swallow legitimate
// invalid-argument failures.
const MISSING_ENTITY_DETAILS = /^(worker|runner) not found\b/i;

// Errors that signal a missing referenced entity (typically Worker / Runner
// being deleted while job/result history still references it).
export function isMissingEntityError(error: unknown): boolean {
    if (!(error instanceof ClientError)) return false;
    if (error.code === Status.NOT_FOUND) return true;
    if (error.code === Status.INVALID_ARGUMENT) {
        return MISSING_ENTITY_DETAILS.test(error.details);
    }
    return false;
}

// React-Query retry callback that skips retries when the entity is missing.
// Used so that detail pages don't loop on permanent errors (e.g. deleted worker).
export function retryUnlessMissing(failureCount: number, error: unknown): boolean {
    if (isMissingEntityError(error)) return false;
    return failureCount < 3;
}

export function isUnavailableError(error: unknown): boolean {
    return error instanceof ClientError && error.code === Status.UNAVAILABLE;
}

// Worker instance availability is operational data. Retry only a bounded
// number of unavailable responses so an outage cannot leave the view loading forever.
export function retryUnavailable(failureCount: number, error: unknown): boolean {
    return isUnavailableError(error) && failureCount < 3;
}

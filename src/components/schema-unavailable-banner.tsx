// Shown on Job/Result detail pages when the worker (or its runner) referenced
// by the record has been deleted, so the protobuf schema for args/result is
// no longer available and the page falls back to raw payloads.
export function SchemaUnavailableBanner() {
    return (
        <div
            role="alert"
            className="rounded-md border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
            <div className="font-semibold">Worker / Runner not found</div>
            <div>
                The worker or its runner has been deleted, so the protobuf schema for arguments and results is unavailable. Showing raw payloads instead.
            </div>
        </div>
    );
}

import { formatSettingValue } from "@/lib/format-value";

interface RunnerSettingsViewProps {
  settings: Record<string, unknown>;
}

/**
 * Render decoded runner settings as a key-value table. Each value is
 * normalized via formatSettingValue so nested JSON strings are pretty-printed
 * and multi-line text keeps its real line breaks instead of collapsing into a
 * single unreadable line.
 */
export function RunnerSettingsView({ settings }: RunnerSettingsViewProps) {
  const entries = Object.entries(settings);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No settings.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-[minmax(8rem,12rem)_1fr]">
      {entries.map(([key, value]) => {
        const formatted = formatSettingValue(value);
        return (
          // display: contents lets each row's two cells flow directly into the
          // parent grid so key and value share the same column tracks.
          <div key={key} className="contents">
            <div className="break-words bg-muted px-3 py-2 text-sm font-medium">
              {key}
            </div>
            <div className="bg-background px-3 py-2">
              {formatted === "" ? (
                <span className="text-muted-foreground">-</span>
              ) : (
                <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-words font-mono text-sm">
                  {formatted}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

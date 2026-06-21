import * as protobuf from "protobufjs";
import { findFirstType } from "./proto-utils";

/**
 * Try to parse a string as JSON, but only when it clearly *is* a JSON
 * object or array. Bare numbers, words, etc. are left alone so we don't
 * accidentally "unwrap" plain text into a different representation.
 */
function tryParseJsonString(s: string): unknown {
  const trimmed = s.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

/**
 * Recursively normalize a value so that any nested string which is actually a
 * JSON object/array gets parsed into real structure. This lets a value like
 * `{ "config": "{\"a\":1}" }` render as a properly nested object instead of an
 * escaped one-line string buried inside JSON.stringify output.
 */
function normalizeDeep(value: unknown, seen = new Set<object>()): unknown {
  if (typeof value === "string") {
    const parsed = tryParseJsonString(value);
    // Only recurse when the string unwrapped into structure; plain strings are
    // returned untouched so their real newlines are preserved by the caller.
    return parsed !== undefined ? normalizeDeep(parsed, seen) : value;
  }

  // Guard against cyclic references. The value type is `unknown`, so callers may
  // pass arbitrary objects; without this a cycle would overflow the stack.
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return value.map((v) => normalizeDeep(v, seen));
  }

  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeDeep(v, seen)]),
    );
  }

  return value;
}

/**
 * Convert an unknown value (decoded from protobuf: runner settings, job args,
 * result output, etc.) into a human-readable string.
 *
 * Such values often carry strings that are themselves JSON or multi-line text,
 * which render unreadably when dumped through a single JSON.stringify. This
 * normalizes each value:
 * - string that is actually JSON  -> parsed and pretty-printed (recursively)
 * - other string                  -> returned as-is (real newlines preserved)
 * - object / array                -> pretty-printed JSON, with any nested JSON
 *                                    strings unwrapped recursively
 * - null / undefined              -> "" (caller may show a dash)
 * - primitive (number/boolean)    -> String(value)
 */
export function formatDecodedValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const parsed = tryParseJsonString(value);
    if (parsed !== undefined) {
      return JSON.stringify(normalizeDeep(parsed), null, 2);
    }
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(normalizeDeep(value), null, 2);
  }

  return String(value);
}

/**
 * Decode a protobuf-encoded byte payload (job args, result output, etc.) into a
 * human-readable string, sharing the same nested-JSON unwrapping as
 * formatDecodedValue.
 *
 * Decoding strategy:
 * 1. If a proto schema is given, decode with its first message type.
 * 2. Otherwise (or on failure) fall back to UTF-8 text, parsing it as JSON when
 *    possible.
 * The decoded value is run through formatDecodedValue so any nested JSON
 * strings are unwrapped and multi-line text keeps its real newlines. Empty and
 * plain-string payloads are handled without throwing.
 */
export function formatProtoBytes(
  bytes?: Uint8Array,
  protoSchema?: string,
): string {
  if (!bytes || bytes.length === 0) return "Empty";

  if (protoSchema) {
    try {
      const root = protobuf.parse(protoSchema).root;
      const type = findFirstType(root);
      if (type) {
        const message = type.decode(bytes);
        return formatDecodedValue(message.toJSON());
      }
    } catch (e) {
      console.warn("Failed to decode using proto schema:", e);
    }
  }

  // Fallback: decode as UTF-8 text. formatDecodedValue handles JSON strings,
  // plain text and empty strings without throwing.
  try {
    return formatDecodedValue(new TextDecoder().decode(bytes));
  } catch {
    return `[Binary Data] ${bytes.length} bytes`;
  }
}

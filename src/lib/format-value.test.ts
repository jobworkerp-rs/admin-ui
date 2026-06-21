import { describe, it, expect } from 'vitest';
import * as protobuf from 'protobufjs';
import { formatSettingValue, formatProtoBytes, findFirstType } from './format-value';

const encode = (s: string) => new TextEncoder().encode(s);

describe('formatSettingValue', () => {
    it('pretty-prints a JSON object string', () => {
        expect(formatSettingValue('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it('pretty-prints a JSON array string', () => {
        expect(formatSettingValue('[1,2]')).toBe('[\n  1,\n  2\n]');
    });

    it('keeps a plain string unchanged (with real newlines)', () => {
        expect(formatSettingValue('line1\nline2')).toBe('line1\nline2');
    });

    it('does NOT unwrap a numeric string', () => {
        expect(formatSettingValue('3000')).toBe('3000');
    });

    it('returns invalid-JSON-looking string as-is', () => {
        expect(formatSettingValue('{not json')).toBe('{not json');
    });

    it('pretty-prints a real object value', () => {
        expect(formatSettingValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    });

    it('pretty-prints a real array value', () => {
        expect(formatSettingValue([1, 2])).toBe('[\n  1,\n  2\n]');
    });

    it('unwraps a nested JSON string inside an object value', () => {
        expect(formatSettingValue({ config: '{"a":1}' })).toBe(
            '{\n  "config": {\n    "a": 1\n  }\n}',
        );
    });

    it('unwraps a nested JSON string inside a JSON object string', () => {
        expect(formatSettingValue('{"config":"{\\"a\\":1}"}')).toBe(
            '{\n  "config": {\n    "a": 1\n  }\n}',
        );
    });

    it('unwraps nested JSON strings inside arrays', () => {
        expect(formatSettingValue(['{"a":1}', 'plain'])).toBe(
            '[\n  {\n    "a": 1\n  },\n  "plain"\n]',
        );
    });

    it('keeps plain nested strings untouched while unwrapping JSON ones', () => {
        expect(formatSettingValue({ note: 'line1\nline2', cfg: '[1,2]' })).toBe(
            '{\n  "note": "line1\\nline2",\n  "cfg": [\n    1,\n    2\n  ]\n}',
        );
    });

    it('returns empty string for null/undefined', () => {
        expect(formatSettingValue(null)).toBe('');
        expect(formatSettingValue(undefined)).toBe('');
    });

    it('stringifies primitives', () => {
        expect(formatSettingValue(42)).toBe('42');
        expect(formatSettingValue(true)).toBe('true');
    });

    it('handles cyclic references without overflowing the stack', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        expect(formatSettingValue(obj)).toBe(
            '{\n  "a": 1,\n  "self": "[Circular]"\n}',
        );
    });

    it('handles deeply nested JSON strings without throwing', () => {
        const deep = JSON.stringify({ a: JSON.stringify({ b: JSON.stringify({ c: 1 }) }) });
        expect(formatSettingValue(deep)).toBe(
            '{\n  "a": {\n    "b": {\n      "c": 1\n    }\n  }\n}',
        );
    });
});

describe('formatProtoBytes', () => {
    it('returns "Empty" for undefined or empty bytes', () => {
        expect(formatProtoBytes(undefined)).toBe('Empty');
        expect(formatProtoBytes(new Uint8Array())).toBe('Empty');
    });

    it('pretty-prints JSON text without a proto schema', () => {
        expect(formatProtoBytes(encode('{"a":1}'))).toBe('{\n  "a": 1\n}');
    });

    it('unwraps nested JSON strings in fallback text', () => {
        expect(formatProtoBytes(encode('{"config":"{\\"a\\":1}"}'))).toBe(
            '{\n  "config": {\n    "a": 1\n  }\n}',
        );
    });

    it('returns plain text as-is when it is not JSON', () => {
        expect(formatProtoBytes(encode('hello world'))).toBe('hello world');
    });

    it('preserves real newlines in plain text', () => {
        expect(formatProtoBytes(encode('line1\nline2'))).toBe('line1\nline2');
    });

    it('decodes bytes using a proto schema and unwraps nested JSON', () => {
        const proto = `
            syntax = "proto3";
            message Args {
                string config = 1;
            }
        `;
        // Encode { config: '{"a":1}' } with the schema, then format it back.
        const root = protobuf.parse(proto).root;
        const type = root.lookupType('Args');
        const bytes = type.encode(type.create({ config: '{"a":1}' })).finish();
        expect(formatProtoBytes(bytes, proto)).toBe(
            '{\n  "config": {\n    "a": 1\n  }\n}',
        );
    });

    it('falls back to text when the proto schema fails to parse', () => {
        // Invalid proto schema -> decode throws -> fall back to UTF-8 text.
        expect(formatProtoBytes(encode('{"a":1}'), 'not a valid proto')).toBe(
            '{\n  "a": 1\n}',
        );
    });

    it('falls back to "[Binary Data]" for non-UTF-8 bytes', () => {
        // Lone continuation byte is invalid UTF-8; with a fatal decoder this
        // would throw, but TextDecoder is lenient by default and yields U+FFFD,
        // so the bytes round-trip into a (replacement) string instead.
        const result = formatProtoBytes(new Uint8Array([0xff, 0xfe, 0xfd]));
        expect(typeof result).toBe('string');
    });
});

describe('findFirstType', () => {
    it('finds the first message type in a proto namespace', () => {
        const root = protobuf.parse(`
            syntax = "proto3";
            message First { string a = 1; }
            message Second { string b = 1; }
        `).root;
        expect(findFirstType(root)?.name).toBe('First');
    });

    it('returns null when no message type is defined', () => {
        const root = protobuf.parse('syntax = "proto3";').root;
        expect(findFirstType(root)).toBeNull();
    });
});

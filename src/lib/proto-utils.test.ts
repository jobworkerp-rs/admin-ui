import { describe, it, expect } from 'vitest';
import * as protobuf from 'protobufjs';
import { findFirstType, decodeProtoToObject } from './proto-utils';

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

describe('decodeProtoToObject', () => {
    const proto = `
        syntax = "proto3";
        message Args {
            string name = 1;
            int32 count = 2;
        }
    `;

    it('decodes bytes into a plain object including defaults', () => {
        const root = protobuf.parse(proto).root;
        const type = root.lookupType('Args');
        const bytes = type.encode(type.create({ name: 'x' })).finish();
        // count defaults to 0 and is included because defaults: true.
        expect(decodeProtoToObject(bytes, proto)).toEqual({ name: 'x', count: 0 });
    });

    it('returns null when the schema has no message type', () => {
        expect(decodeProtoToObject(new Uint8Array(), 'syntax = "proto3";')).toBeNull();
    });
});

import * as protobuf from "protobufjs";

/** Find the first concrete message type defined anywhere in a proto namespace. */
export function findFirstType(
  namespace: protobuf.NamespaceBase,
): protobuf.Type | null {
  for (const nested of namespace.nestedArray) {
    if (nested instanceof protobuf.Type) return nested;
    if (nested instanceof protobuf.Namespace) {
      const found = findFirstType(nested);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Decode a protobuf-encoded payload into a plain object using the schema's
 * first message type. Returns null when the schema has no message type. Enums
 * are decoded to their string names and defaults are included so the resulting
 * object is suitable for display and for round-tripping through a form.
 */
export function decodeProtoToObject(
  bytes: Uint8Array,
  protoSchema: string,
): Record<string, unknown> | null {
  const root = protobuf.parse(protoSchema).root;
  const type = findFirstType(root);
  if (!type) return null;
  const decoded = type.decode(bytes);
  return type.toObject(decoded, { enums: String, defaults: true });
}

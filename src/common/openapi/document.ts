/**
 * OpenAPI document normalizer.
 *
 * Recursively transforms raw Danet/Zod output into a clean,
 * deterministic OpenAPI 3.0.3 document suitable for GraphQL Mesh
 * consumption.
 */

/** Recursively sort object keys for deterministic output. */
function sortKeys<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys) as T;
  }
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted as T;
  }
  return value;
}

/**
 * Normalize a type value that may be an array (JSON Schema style)
 * into an OpenAPI 3.0-compatible form.
 *
 * - `type: ["string", "null"]` becomes `type: "string", nullable: true`
 * - `type: ["object"]` becomes `type: "object"`
 * - `type: ["number", "null"]` becomes `type: "number", nullable: true`
 * - `type: ["integer", "null"]` becomes `type: "integer", nullable: true`
 * - `type: ["boolean", "null"]` becomes `type: "boolean", nullable: true`
 * - `type: ["array", "null"]` becomes `type: "array", nullable: true`
 * - Other multi-type arrays throw an error.
 */
function normalizeType(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const type = schema.type;

  if (!Array.isArray(type)) {
    return schema;
  }

  const nonNull = type.filter((t: unknown) => t !== 'null');
  const hasNull = type.includes('null');

  if (hasNull && nonNull.length === 1) {
    // type: ["string", "null"] -> type: "string", nullable: true
    const result: Record<string, unknown> = {
      ...schema,
      type: nonNull[0] as string,
      nullable: true,
    };
    delete result['x-nullable'];
    return result;
  }

  if (!hasNull && nonNull.length === 1) {
    // type: ["object"] -> type: "object"
    return { ...schema, type: nonNull[0] as string };
  }

  if (nonNull.length > 1) {
    throw new Error(
      `Unsupported multi-type array in OpenAPI 3.0: type: ${
        JSON.stringify(type)
      }. ` +
        'OpenAPI 3.0 requires type to be a single string. Use oneOf or anyOf for union types.',
    );
  }

  // type: ["null"] only — extremely rare, treat as nullable empty
  return { ...schema, type: 'string', nullable: true };
}

/**
 * Recursively walk a schema object, normalizing type arrays and
 * sorting keys for deterministic output.
 */
function normalizeSchema(
  value: unknown,
  path: string,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => normalizeSchema(item, `${path}[${i}]`));
  }
  if (typeof value !== 'object') {
    return value;
  }

  const obj = value as Record<string, unknown>;
  let normalized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const childPath = path ? `${path}.${key}` : key;
    normalized[key] = normalizeSchema(val, childPath);
  }

  // Normalize type arrays at this level
  if ('type' in normalized && Array.isArray(normalized.type)) {
    normalized = normalizeType(normalized);
  }

  return normalized;
}

/**
 * Normalize a raw OpenAPI document produced by Danet/Zod into a
 * clean, deterministic OpenAPI 3.0.3 document.
 *
 * Transformations:
 * - Converts JSON Schema `type` arrays to OpenAPI 3.0 single-type + `nullable`
 * - Sorts all object keys for deterministic diff output
 * - Throws on unsupported multi-type arrays
 */
export function normalizeOpenApiDocument(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = normalizeSchema(doc, '') as Record<string, unknown>;
  return sortKeys(normalized);
}

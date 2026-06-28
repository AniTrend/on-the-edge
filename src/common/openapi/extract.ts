/**
 * Inline schema extraction for OpenAPI documents.
 *
 * Danet's `generateZodSchema()` only promotes nested ZodObjects to
 * `$ref` components (properties + title). Enums and constrained
 * scalars are always inlined regardless of `.openapi()` metadata.
 * GraphQL Mesh then auto-generates ugly names for these inline types
 * (e.g., `queryInput_episodes_kind`, `query_series_format`).
 *
 * This module walks the existing document and promotes any inline
 * schema with a `title` to a top-level `components.schemas` entry,
 * replacing inline occurrences with `$ref`.
 *
 * Walk rules:
 * - Component properties (depth 1) + their array items (depth 2)
 * - Path-level query parameters
 * - Has `title` but no `$ref` → clone to component, replace with `$ref`
 * - First occurrence by title wins (deduplication)
 */

/** Maximum property nesting depth for extraction. */
const MAX_DEPTH = 2;

/**
 * Register a schema component if a component with the same title
 * does not already exist.
 */
function registerIfAbsent(
  schema: Record<string, unknown>,
  schemas: Record<string, unknown>,
): void {
  const title = schema.title as string | undefined;
  if (!title) return;
  if (!schemas[title]) {
    schemas[title] = { ...schema };
  }
}

/**
 * Recursively walk a schema object's properties, promoting inline
 * named schemas to top-level components.
 */
function extractFromProperties(
  schema: Record<string, unknown>,
  schemas: Record<string, unknown>,
  depth: number,
): void {
  if (depth > MAX_DEPTH) return;

  const properties = schema.properties as Record<string, unknown> | undefined;
  if (!properties) return;

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as Record<string, unknown>;

    // Already a $ref — nothing to extract here
    if (propSchema.$ref) continue;

    // Extract this property if it has an explicit title
    if (propSchema.title && typeof propSchema.title === 'string') {
      registerIfAbsent(propSchema, schemas);
      properties[key] = {
        $ref: `#/components/schemas/${propSchema.title}`,
      };
      continue;
    }

    // Walk into array items (depth + 1)
    const items = propSchema.items as Record<string, unknown> | undefined;
    if (items && !items.$ref) {
      if (items.title && typeof items.title === 'string') {
        registerIfAbsent(items, schemas);
        propSchema.items = {
          $ref: `#/components/schemas/${items.title}`,
        };
      } else {
        extractFromProperties(items, schemas, depth + 1);
      }
    }

    // Walk into nested object properties
    if (propSchema.properties) {
      extractFromProperties(propSchema, schemas, depth + 1);
    }
  }
}

/**
 * Promote inline named schemas in a raw OpenAPI document to
 * top-level `components.schemas` entries with `$ref` references.
 *
 * Modifies the document in place and returns it for chaining.
 *
 * @param doc - The normalized OpenAPI document (post-normalize).
 * @returns The same document reference (mutated in place).
 */
export function extractInlineSchemas(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const schemas = (doc.components as Record<string, unknown>)
    ?.schemas as Record<string, unknown> | undefined;
  if (!schemas) return doc;

  // 1. Walk component properties, repeating until no new schemas
  //    are promoted (newly extracted components may themselves contain
  //    nested inline schemas that need extraction).
  let previousCount = 0;
  while (Object.keys(schemas).length !== previousCount) {
    previousCount = Object.keys(schemas).length;
    for (const schema of Object.values(schemas)) {
      extractFromProperties(schema as Record<string, unknown>, schemas, 0);
    }
  }

  // 2. Walk path-level query parameters
  const paths = doc.paths as Record<string, unknown> | undefined;
  if (paths) {
    for (const pathEntry of Object.values(paths)) {
      const methods = pathEntry as Record<string, unknown>;
      for (const method of Object.values(methods)) {
        const op = method as Record<string, unknown>;
        const params = op.parameters as
          | Array<Record<string, unknown>>
          | undefined;
        if (!params) continue;
        for (const param of params) {
          const paramSchema = param.schema as
            | Record<string, unknown>
            | undefined;
          if (
            paramSchema?.title &&
            typeof paramSchema.title === 'string' &&
            !paramSchema.$ref
          ) {
            registerIfAbsent(paramSchema, schemas);
            param.schema = {
              $ref: `#/components/schemas/${paramSchema.title}`,
            };
          }
        }
      }
    }
  }

  return doc;
}

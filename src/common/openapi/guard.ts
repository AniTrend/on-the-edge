/**
 * OpenAPI contract validation.
 *
 * Validates that a generated OpenAPI document meets the contract
 * hygiene requirements for GraphQL Mesh consumption. Fails fast
 * on invalid output so that CI blocks publication.
 */

import {
  ALLOWLIST_LOWERCASE_NAMES,
  EXPECTED_OPERATION_IDS,
  EXPECTED_SCHEMA_NAMES,
  VALID_SCHEMA_NAME_PATTERN,
} from './names.ts';

/** Validation error with context. */
export class OpenApiContractError extends Error {
  constructor(
    message: string,
    public readonly violations: string[],
  ) {
    super(message);
    this.name = 'OpenApiContractError';
  }
}

/**
 * Recursively search for type arrays in a schema object.
 * Returns paths where `type` is an array.
 */
function findTypeArrays(
  obj: unknown,
  path: string,
  violations: string[],
): void {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => findTypeArrays(item, `${path}[${i}]`, violations));
    return;
  }

  const record = obj as Record<string, unknown>;
  if ('type' in record && Array.isArray(record.type)) {
    violations.push(
      `OpenAPI 3.0 type array at ${path || '(root)'}: type=${
        JSON.stringify(record.type)
      }`,
    );
  }

  for (const [key, value] of Object.entries(record)) {
    findTypeArrays(value, path ? `${path}.${key}` : key, violations);
  }
}

/**
 * Assert that path response schemas use $ref (named components) and
 * do not contain inline object schemas that would produce unstable
 * GraphQL Mesh type names.
 *
 * Accepted:
 *   { "$ref": "#/components/schemas/Config" }
 *   { "type": "array", "items": { "$ref": "#/components/schemas/News" } }
 *
 * Rejected:
 *   { "type": "object", "properties": { ... } }
 */
function checkInlineResponses(
  paths: Record<string, unknown>,
  violations: string[],
): void {
  for (const [pathKey, pathEntry] of Object.entries(paths)) {
    const methods = pathEntry as Record<string, unknown>;
    for (const [method, operation] of Object.entries(methods)) {
      const op = operation as Record<string, unknown>;
      if (!op.responses || typeof op.responses !== 'object') continue;

      const responses = op.responses as Record<string, unknown>;
      const response = responses['200'] || responses[200];
      if (!response || typeof response !== 'object') continue;

      const r200 = response as Record<string, unknown>;
      const content = r200.content as Record<string, unknown> | undefined;
      if (!content) continue;

      const json = content['application/json'] as
        | Record<
          string,
          unknown
        >
        | undefined;
      if (!json || !json.schema) continue;

      const schema = json.schema as Record<string, unknown>;

      // Accepted: direct $ref
      if (typeof schema.$ref === 'string') continue;

      // Accepted: array of $ref
      if (
        schema.type === 'array' &&
        schema.items &&
        typeof (schema.items as Record<string, unknown>).$ref === 'string'
      ) {
        continue;
      }

      // Rejected: inline object or anything else
      const opId = typeof op.operationId === 'string'
        ? ` (operationId: ${op.operationId})`
        : '';
      violations.push(
        `Inline response schema at ${method.toUpperCase()} ${pathKey} 200 application/json${opId}. ` +
          'Expected $ref to a named component or array of $ref.',
      );
    }
  }
}

/**
 * Assert that an OpenAPI document meets contract hygiene requirements.
 *
 * Checks:
 * 1. No `components.schemas.undefined` entry
 * 2. No schema names that are empty, lowercase-accidental, or path-derived garbage
 * 3. No OpenAPI 3.0 `type` arrays remain after normalization
 * 4. Expected public operation IDs are present
 * 5. Expected public schema names are present
 * 6. No inline response object schemas for 200 application/json (allowlisted exceptions TBD)
 *
 * @throws {OpenApiContractError} when any violation is found
 */
export function assertOpenApiContract(
  doc: Record<string, unknown>,
): void {
  const violations: string[] = [];

  // 0. Required top-level sections must exist
  if (!doc.components || !(doc.components as Record<string, unknown>).schemas) {
    violations.push(
      'Expected components.schemas to exist in the OpenAPI document',
    );
  }
  if (!doc.paths) {
    violations.push('Expected paths to exist in the OpenAPI document');
  }

  // 1. No undefined schema component
  const schemas = (doc.components as Record<string, unknown>)
    ?.schemas as Record<string, unknown> | undefined;

  if (schemas) {
    if ('undefined' in schemas) {
      violations.push(
        'components.schemas contains "undefined" — this indicates lost Zod/OpenAPI metadata',
      );
    }

    // 2. Check schema names for garbage
    for (const name of Object.keys(schemas)) {
      if (name === '') {
        violations.push(
          'components.schemas contains an empty-string schema name',
        );
      }
      if (
        !VALID_SCHEMA_NAME_PATTERN.test(name) &&
        !ALLOWLIST_LOWERCASE_NAMES.includes(name)
      ) {
        violations.push(
          `components.schemas["${name}"] does not match PascalCase pattern — possible generated or path-derived name`,
        );
      }
    }
  }

  // 3. No type arrays (should have been normalized)
  findTypeArrays(doc, '', violations);

  // 4. Expected operation IDs
  const paths = doc.paths as Record<string, unknown> | undefined;
  if (paths) {
    const operationIds = new Set<string>();
    for (const pathEntry of Object.values(paths)) {
      const methods = pathEntry as Record<string, unknown>;
      for (const method of Object.values(methods)) {
        if (typeof method === 'object' && method !== null) {
          const op = method as Record<string, unknown>;
          if (typeof op.operationId === 'string') {
            operationIds.add(op.operationId);
          }
        }
      }
    }

    for (const expectedId of EXPECTED_OPERATION_IDS) {
      if (!operationIds.has(expectedId)) {
        violations.push(
          `Expected operation ID "${expectedId}" not found in document paths`,
        );
      }
    }

    // 4b. Check response schemas use $ref (named components)
    checkInlineResponses(paths, violations);
  }

  // 5. Expected schema names
  if (schemas) {
    const schemaNames = new Set(Object.keys(schemas));
    for (const expectedName of EXPECTED_SCHEMA_NAMES) {
      if (!schemaNames.has(expectedName)) {
        violations.push(
          `Expected schema "${expectedName}" not found in components.schemas`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new OpenApiContractError(
      `OpenAPI contract validation failed with ${violations.length} violation(s):\n${
        violations.join('\n')
      }`,
      violations,
    );
  }
}

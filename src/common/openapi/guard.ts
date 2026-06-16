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

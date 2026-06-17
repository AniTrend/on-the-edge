/**
 * Public OpenAPI contract helpers.
 *
 * Provides a name-aware paging wrapper and re-exports the centralized
 * Zod instance for use in contract schema definitions.
 */

import { z } from './zod.ts';

/**
 * Create a named, OpenAPI-aware cursor-paging contract schema.
 *
 * Unlike the runtime `createPagingSchema`, this produces a named
 * schema component (e.g. `NewsConnection`) so that GraphQL Mesh
 * can derive stable GraphQL type names from the OpenAPI output.
 *
 * @param name - The model name (e.g. "News"). Produces `${name}Connection`.
 * @param itemSchema - The Zod schema for the array item type.
 */
export const createPagingContract = <T>(
  name: string,
  itemSchema: z.ZodType<T>,
) =>
  z.object({
    first: z.string().nullable().optional(),
    last: z.string().nullable().optional(),
    count: z.number().min(0),
    data: z.array(itemSchema),
  }).openapi({
    title: `${name}Connection`,
    description: `Cursor-paged ${name} connection`,
  });

export { z } from './zod.ts';
export { normalizeOpenApiDocument } from './document.ts';
export { assertOpenApiContract, OpenApiContractError } from './guard.ts';
export {
  EXPECTED_OPERATION_IDS,
  EXPECTED_SCHEMA_NAMES,
  VALID_SCHEMA_NAME_PATTERN,
} from './names.ts';

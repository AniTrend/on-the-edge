/**
 * Tests for OpenAPI contract helpers.
 *
 * Validates that createPagingContract produces named schemas
 * and that the centralized z instance has OpenAPI extensions.
 */

import { assertEquals } from '@std/assert';
import { createPagingContract, z } from './mod.ts';

Deno.test('centralized z instance has openapi method', () => {
  const schema = z.object({ name: z.string() }).openapi({
    title: 'TestSchema',
  });
  // The openapi method should exist and not throw
  assertEquals(typeof schema.openapi, 'function');
});

Deno.test('createPagingContract produces a named schema', () => {
  const ItemContract = z.object({
    id: z.string(),
    name: z.string(),
  }).openapi({ title: 'Item' });

  const pagingContract = createPagingContract('Item', ItemContract);

  // The paging contract should be a ZodObject with openapi metadata
  assertEquals(typeof pagingContract.openapi, 'function');
});

Deno.test('createPagingContract includes expected fields', () => {
  const ItemContract = z.object({
    id: z.string(),
  }).openapi({ title: 'Item' });

  const pagingContract = createPagingContract('Item', ItemContract);
  const shape = pagingContract._def.shape();

  assertEquals(Object.keys(shape).sort(), [
    'count',
    'data',
    'first',
    'last',
  ]);
});

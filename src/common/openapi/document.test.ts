/**
 * Tests for OpenAPI document normalizer.
 *
 * Validates that type arrays, nullable handling, and key sorting
 * work correctly for OpenAPI 3.0.3 compliance.
 */

import { assertEquals, assertThrows } from '@std/assert';
import { normalizeOpenApiDocument } from './document.ts';

Deno.test('normalizeOpenApiDocument converts type: ["string", "null"] to type: "string", nullable: true', () => {
  const input = {
    components: {
      schemas: {
        Example: {
          type: ['string', 'null'],
          description: 'test',
        },
      },
    },
  };

  const result = normalizeOpenApiDocument(input);
  const schema = (result.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  const example = schema.Example as Record<string, unknown>;

  assertEquals(example.type, 'string');
  assertEquals(example.nullable, true);
  assertEquals(example.description, 'test');
});

Deno.test('normalizeOpenApiDocument converts type: ["number", "null"] to type: "number", nullable: true', () => {
  const input = {
    components: {
      schemas: {
        Count: {
          type: ['number', 'null'],
        },
      },
    },
  };

  const result = normalizeOpenApiDocument(input);
  const schema = (result.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  const count = schema.Count as Record<string, unknown>;

  assertEquals(count.type, 'number');
  assertEquals(count.nullable, true);
});

Deno.test('normalizeOpenApiDocument converts type: ["object"] to type: "object"', () => {
  const input = {
    components: {
      schemas: {
        Item: {
          type: ['object'],
          properties: {},
        },
      },
    },
  };

  const result = normalizeOpenApiDocument(input);
  const schema = (result.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  const item = schema.Item as Record<string, unknown>;

  assertEquals(item.type, 'object');
});

Deno.test('normalizeOpenApiDocument throws on unsupported multi-type arrays', () => {
  const input = {
    components: {
      schemas: {
        Bad: {
          type: ['string', 'number'],
        },
      },
    },
  };

  assertThrows(
    () => normalizeOpenApiDocument(input),
    Error,
    'Unsupported multi-type array',
  );
});

Deno.test('normalizeOpenApiDocument sorts keys deterministically', () => {
  const input = {
    z: 'last',
    a: 'first',
    m: 'middle',
  };

  const result = normalizeOpenApiDocument(input);
  const keys = Object.keys(result);

  assertEquals(keys, ['a', 'm', 'z']);
});

Deno.test('normalizeOpenApiDocument handles deeply nested type arrays', () => {
  const input = {
    components: {
      schemas: {
        Nested: {
          type: 'object',
          properties: {
            name: {
              type: ['string', 'null'],
            },
            count: {
              type: ['integer', 'null'],
            },
          },
        },
      },
    },
  };

  const result = normalizeOpenApiDocument(input);
  const schema = (result.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  const nested = schema.Nested as Record<string, unknown>;
  const props = nested.properties as Record<string, unknown>;

  const name = props.name as Record<string, unknown>;
  assertEquals(name.type, 'string');
  assertEquals(name.nullable, true);

  const count = props.count as Record<string, unknown>;
  assertEquals(count.type, 'integer');
  assertEquals(count.nullable, true);
});

Deno.test('normalizeOpenApiDocument preserves non-type fields', () => {
  const input = {
    components: {
      schemas: {
        Example: {
          type: ['string', 'null'],
          description: 'A test field',
          example: 'hello',
          enum: ['a', 'b'],
        },
      },
    },
  };

  const result = normalizeOpenApiDocument(input);
  const schema = (result.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  const example = schema.Example as Record<string, unknown>;

  assertEquals(example.type, 'string');
  assertEquals(example.nullable, true);
  assertEquals(example.description, 'A test field');
  assertEquals(example.example, 'hello');
  assertEquals(example.enum, ['a', 'b']);
});

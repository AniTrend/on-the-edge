/**
 * Tests for OpenAPI contract validation guard.
 *
 * Validates that the guard catches contract hygiene violations
 * and passes valid documents.
 */

import { assertThrows } from '@std/assert';
import { assertOpenApiContract, OpenApiContractError } from './guard.ts';

/** Minimal valid OpenAPI document that passes all checks. */
function makeValidDoc(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};
  const expectedNames = [
    'Config',
    'ConfigSettings',
    'ConfigImage',
    'News',
    'NewsConnection',
    'Episodes',
    'Series',
    'SeriesId',
    'SeriesTitle',
    'SeriesSchedule',
    'SeriesCoverImage',
    'Studio',
    'Person',
    'Character',
    'PushVapid',
    'PushInstallation',
    'PushAcknowledgment',
    'PushRegistrationBody',
    'PushConfirmBody',
    'PushProfileBody',
    'PushPreferencesBody',
    'PushDeleteBody',
    // Input / enum schemas (extracted by extractInlineSchemas)
    'EpisodeKind',
    'NewsFeedLocale',
    'SeriesFormat',
    'SeriesStatus',
    'SeriesSource',
    'SeriesKind',
    'SeriesNetworkCategory',
  ];
  for (const name of expectedNames) {
    schemas[name] = { type: 'object', properties: {} };
  }

  return {
    openapi: '3.0.3',
    info: { title: 'Edge API', version: '1.0' },
    paths: {
      '/v1/config': {
        get: {
          operationId: 'config',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Config' },
                },
              },
            },
          },
        },
      },
      '/v1/news/feed': {
        get: {
          operationId: 'newsFeed',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/News' },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/news': {
        get: {
          operationId: 'news',
          responses: {},
        },
      },
      '/v1/episodes': {
        get: {
          operationId: 'episodes',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Episodes' },
                },
              },
            },
          },
        },
      },
      '/v1/series': {
        get: {
          operationId: 'series',
          responses: {},
        },
      },
      '/v1/studio': {
        get: {
          operationId: 'studio',
          responses: {},
        },
      },
      '/v1/people': {
        get: {
          operationId: 'person',
          responses: {},
        },
      },
      '/v1/character': {
        get: {
          operationId: 'character',
          responses: {},
        },
      },
      '/v1/push/vapid': {
        get: {
          operationId: 'vapid',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushVapid' },
                },
              },
            },
          },
        },
      },
      '/v1/push/installations': {
        post: {
          operationId: 'registerInstallation',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushRegistrationBody' },
              },
            },
          },
          responses: {},
        },
      },
      '/v1/push/installations/:installationId/confirm': {
        post: {
          operationId: 'confirmInstallation',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushConfirmBody' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushInstallation' },
                },
              },
            },
          },
        },
      },
      '/v1/push/installations/:installationId/profile': {
        put: {
          operationId: 'updateProfile',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushProfileBody' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushAcknowledgment' },
                },
              },
            },
          },
        },
      },
      '/v1/push/installations/:installationId/preferences': {
        patch: {
          operationId: 'updatePreferences',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushPreferencesBody' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushAcknowledgment' },
                },
              },
            },
          },
        },
      },
      '/v1/push/installations/:installationId': {
        delete: {
          operationId: 'deleteInstallation',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PushDeleteBody' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushAcknowledgment' },
                },
              },
            },
          },
        },
      },
      '/v1/push/installations/:installationId/test': {
        post: {
          operationId: 'sendTestPush',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PushAcknowledgment' },
                },
              },
            },
          },
        },
      },
      '/': {
        get: {
          operationId: 'index',
          responses: {},
        },
      },
    },
    components: { schemas },
    ...overrides,
  };
}

Deno.test('assertOpenApiContract passes a valid document', () => {
  const doc = makeValidDoc();
  // Should not throw
  assertOpenApiContract(doc);
});

Deno.test('assertOpenApiContract rejects components.schemas.undefined', () => {
  const doc = makeValidDoc();
  (doc.components as Record<string, unknown>).schemas = {
    ...((doc.components as Record<string, unknown>).schemas as Record<
      string,
      unknown
    >),
    undefined: { type: 'object' },
  };

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    '"undefined"',
  );
});

Deno.test('assertOpenApiContract rejects empty-string schema names', () => {
  const doc = makeValidDoc();
  const schemas = (doc.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  schemas[''] = { type: 'object' };

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'empty-string',
  );
});

Deno.test('assertOpenApiContract rejects lowercase schema names', () => {
  const doc = makeValidDoc();
  const schemas = (doc.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  schemas['badName'] = { type: 'object' };

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'PascalCase',
  );
});

Deno.test('assertOpenApiContract rejects type arrays in schema', () => {
  const doc = makeValidDoc();
  const schemas = (doc.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  schemas.News = {
    type: 'object',
    properties: {
      category: { type: ['string', 'null'] },
    },
  };

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'type array',
  );
});

Deno.test('assertOpenApiContract rejects missing expected operation IDs', () => {
  const doc = makeValidDoc();
  // Remove one operation ID
  const paths = doc.paths as Record<string, unknown>;
  delete paths['/v1/config'];

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    '"config"',
  );
});

Deno.test('assertOpenApiContract rejects missing expected schema names', () => {
  const doc = makeValidDoc();
  const schemas = (doc.components as Record<string, unknown>)
    .schemas as Record<string, unknown>;
  delete schemas.News;

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    '"News"',
  );
});

Deno.test('assertOpenApiContract rejects inline 200 response object schema', () => {
  const doc = makeValidDoc();
  const paths = doc.paths as Record<string, unknown>;
  (paths['/v1/config'] as Record<string, unknown>).get = {
    operationId: 'config',
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
    },
  };

  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'Inline response schema',
  );
});

Deno.test('assertOpenApiContract passes with $ref and array-of-$ref response schemas', () => {
  // makeValidDoc already uses $ref and array-of-$ref
  const doc = makeValidDoc();
  assertOpenApiContract(doc);
});

Deno.test('assertOpenApiContract rejects missing components.schemas', () => {
  const doc = makeValidDoc({ components: undefined });
  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'components.schemas',
  );
});

Deno.test('assertOpenApiContract rejects missing paths', () => {
  const doc = makeValidDoc({ paths: undefined });
  assertThrows(
    () => assertOpenApiContract(doc),
    OpenApiContractError,
    'paths',
  );
});

/**
 * Tests for inline schema extraction.
 *
 * Validates that `extractInlineSchemas` promotes inline schemas
 * carrying an explicit `.openapi({ title })` to top-level
 * `components.schemas` entries and replaces inline occurrences
 * with `$ref`. This is what keeps nested push request schemas
 * from becoming path-derived GraphQL names
 * (e.g. `mutationInput_updateProfile_input_*`).
 */

import { assertEquals } from '@std/assert';
import { extractInlineSchemas } from './extract.ts';

function componentsOf(doc: Record<string, unknown>): Record<string, unknown> {
  return (doc.components as Record<string, unknown>).schemas as Record<
    string,
    unknown
  >;
}

Deno.test(
  'extractInlineSchemas promotes a titled nested object and replaces it with $ref',
  () => {
    const doc = {
      components: {
        schemas: {
          PushProfileBody: {
            description: 'Profile update request body',
            properties: {
              device: {
                default: null,
                nullable: true,
                properties: {
                  manufacturer: {
                    default: null,
                    nullable: true,
                    type: 'string',
                  },
                  model: {
                    default: null,
                    nullable: true,
                    type: 'string',
                  },
                },
                title: 'PushProfileDevice',
                type: 'object',
              },
            },
            title: 'PushProfileBody',
            type: 'object',
          },
        },
      },
      paths: {},
    };

    extractInlineSchemas(doc);

    const schemas = componentsOf(doc);
    const profileBody = schemas.PushProfileBody as Record<string, unknown>;
    const properties = profileBody.properties as Record<string, unknown>;

    assertEquals(properties.device, {
      $ref: '#/components/schemas/PushProfileDevice',
    });

    const device = schemas.PushProfileDevice as Record<string, unknown>;
    assertEquals(device.title, 'PushProfileDevice');
    assertEquals(device.type, 'object');
    assertEquals(device.nullable, true);
    assertEquals(
      Object.keys(
        (device.properties as Record<string, unknown>).manufacturer as Record<
          string,
          unknown
        >,
      ).sort(),
      ['default', 'nullable', 'type'],
    );
  },
);

Deno.test(
  'extractInlineSchemas promotes a titled array-item enum and replaces it with $ref',
  () => {
    const doc = {
      components: {
        schemas: {
          PushRegistrationBody: {
            description: 'Installation registration request body',
            properties: {
              topics: {
                default: [],
                items: {
                  enum: ['NEWS', 'APP_ANNOUNCEMENTS', 'SYNC'],
                  title: 'PushRegistrationTopic',
                  type: 'string',
                },
                type: 'array',
              },
            },
            title: 'PushRegistrationBody',
            type: 'object',
          },
        },
      },
      paths: {},
    };

    extractInlineSchemas(doc);

    const schemas = componentsOf(doc);
    const registrationBody = schemas.PushRegistrationBody as Record<
      string,
      unknown
    >;
    const topics = (registrationBody.properties as Record<string, unknown>)
      .topics as Record<string, unknown>;

    assertEquals(topics.items, {
      $ref: '#/components/schemas/PushRegistrationTopic',
    });
    assertEquals(topics.type, 'array');

    const topic = schemas.PushRegistrationTopic as Record<string, unknown>;
    assertEquals(topic.title, 'PushRegistrationTopic');
    assertEquals(topic.enum, ['NEWS', 'APP_ANNOUNCEMENTS', 'SYNC']);
    assertEquals(topic.type, 'string');
  },
);

Deno.test(
  'extractInlineSchemas re-walks newly promoted components for nested titles',
  () => {
    const doc = {
      components: {
        schemas: {
          PushProfileBody: {
            description: 'Profile update request body',
            properties: {
              device: {
                default: null,
                nullable: true,
                properties: {
                  platform: {
                    default: null,
                    enum: ['ANDROID'],
                    nullable: true,
                    title: 'PushProfileDevicePlatform',
                    type: 'string',
                  },
                },
                title: 'PushProfileDevice',
                type: 'object',
              },
            },
            title: 'PushProfileBody',
            type: 'object',
          },
        },
      },
      paths: {},
    };

    extractInlineSchemas(doc);

    const schemas = componentsOf(doc);

    const device = schemas.PushProfileDevice as Record<string, unknown>;
    const platform = (device.properties as Record<string, unknown>)
      .platform as Record<string, unknown>;
    assertEquals(platform, {
      $ref: '#/components/schemas/PushProfileDevicePlatform',
    });

    const platformSchema = schemas.PushProfileDevicePlatform as Record<
      string,
      unknown
    >;
    assertEquals(platformSchema.title, 'PushProfileDevicePlatform');
    assertEquals(platformSchema.enum, ['ANDROID']);
  },
);

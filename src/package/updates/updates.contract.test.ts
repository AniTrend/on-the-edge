import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import {
  UpdateChannelContract,
  UpdateReleaseContract,
} from './updates.contract.ts';
import { UpdateQuerySchema } from './updates.schema.ts';
import { UpdateQuerySwagger, UpdateReleaseSwagger } from './updates.swagger.ts';

// deno-lint-ignore no-explicit-any
const titleOf = (schema: any): string | undefined => schema?.metaOpenApi?.title;

describe('Update contract schemas', () => {
  it('exposes the release contract with explicit title metadata', () => {
    assertEquals(titleOf(UpdateReleaseContract), 'UpdateRelease');
    assertEquals(titleOf(UpdateChannelContract), 'UpdateChannel');
  });

  it('carries the observed AniTrend manifest fields only', () => {
    const keys = Object.keys(UpdateReleaseContract.shape).sort();
    assertEquals(keys, [
      'appId',
      'channel',
      'code',
      'migration',
      'minSdk',
      'releaseNotes',
      'updatedAt',
      'version',
    ]);
  });

  it('does not invent download or publication fields', () => {
    const shape = UpdateReleaseContract.shape as Record<string, unknown>;
    assertEquals('url' in shape, false);
    assertEquals('publishedAt' in shape, false);
    assertEquals('downloadUrl' in shape, false);
  });

  it('uses nullable and optional rather than nullish for optional fields', () => {
    const shape = UpdateReleaseContract.shape;
    // The migration union cannot carry nullable: anatine's generator
    // emits a null-only type array for nullable unions, which the
    // contract normalizer rejects. It is optional instead.
    assertEquals(shape.migration.isNullable(), false);
    assertEquals(shape.migration.isOptional(), true);
    assertEquals(shape.releaseNotes.isNullable(), true);
    assertEquals(shape.releaseNotes.isOptional(), true);
  });

  it('exposes the channel enum with the v2 release channels', () => {
    assertEquals(UpdateChannelContract.options, [
      'STABLE',
      'BETA',
      'EXPERIMENTAL',
    ]);
  });

  it('exposes updatedAt as the cache freshness metadata', () => {
    const field = UpdateReleaseContract.shape.updatedAt;
    assertEquals(field.isFinite, true);
  });
});

describe('UpdateQuerySchema', () => {
  it('defaults to STABLE when channel is absent', () => {
    const parsed = UpdateQuerySchema.safeParse({});
    assertEquals(parsed.success, true);
    if (parsed.success) {
      assertEquals(parsed.data.channel, 'STABLE');
    }
  });

  it('accepts every channel value', () => {
    for (const channel of ['STABLE', 'BETA', 'EXPERIMENTAL']) {
      assertEquals(
        UpdateQuerySchema.safeParse({ channel }).success,
        true,
      );
    }
  });

  it('rejects unknown channel values', () => {
    assertEquals(
      UpdateQuerySchema.safeParse({ channel: 'FOO' }).success,
      false,
    );
  });

  it('rejects unknown query parameters', () => {
    assertEquals(
      UpdateQuerySchema.safeParse({ channel: 'STABLE', limit: '5' }).success,
      false,
    );
  });
});

describe('Update swagger exports', () => {
  it('re-exports the contract as the response swagger schema', () => {
    assertEquals(UpdateReleaseSwagger, UpdateReleaseContract);
  });

  it('wraps the query schema with a named title', () => {
    assertEquals(titleOf(UpdateQuerySwagger), 'UpdateQuery');
  });
});

import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import {
  UpdateChannelContract,
  UpdateDecisionContract,
  UpdateDecisionStatusContract,
  UpdateProductContract,
  UpdateReleaseAssetContract,
  UpdateReleaseContract,
} from './updates.contract.ts';
import { UpdateQuerySchema } from './updates.schema.ts';
import {
  UpdateDecisionStatusSwagger,
  UpdateDecisionSwagger,
  UpdateProductSwagger,
  UpdateQuerySwagger,
  UpdateReleaseSwagger,
} from './updates.swagger.ts';

// deno-lint-ignore no-explicit-any
const titleOf = (schema: any): string | undefined => schema?.metaOpenApi?.title;

describe('Update contract schemas', () => {
  it('exposes release-backed contract schemas with explicit title metadata', () => {
    assertEquals(titleOf(UpdateReleaseContract), 'UpdateRelease');
    assertEquals(titleOf(UpdateProductContract), 'UpdateProduct');
    assertEquals(titleOf(UpdateChannelContract), 'UpdateChannel');
    assertEquals(titleOf(UpdateReleaseAssetContract), 'UpdateReleaseAsset');
    assertEquals(titleOf(UpdateDecisionContract), 'UpdateDecision');
    assertEquals(titleOf(UpdateDecisionStatusContract), 'UpdateDecisionStatus');
  });

  it('carries the release-backed fields only', () => {
    const keys = Object.keys(UpdateReleaseContract.shape).sort();
    assertEquals(keys, [
      'assets',
      'channel',
      'code',
      'htmlUrl',
      'name',
      'prerelease',
      'product',
      'publishedAt',
      'releaseNotes',
      'tag',
      'updatedAt',
      'version',
    ]);
  });

  it('does not expose legacy version.json fields', () => {
    const shape = UpdateReleaseContract.shape as Record<string, unknown>;
    assertEquals('migration' in shape, false);
    assertEquals('minSdk' in shape, false);
    assertEquals('appId' in shape, false);
  });

  it('does not invent a single download URL field', () => {
    const shape = UpdateReleaseContract.shape as Record<string, unknown>;
    assertEquals('downloadUrl' in shape, false);
    assertEquals('url' in shape, false);
  });

  it('uses nullable and optional rather than nullish for optional fields', () => {
    const shape = UpdateReleaseContract.shape;
    assertEquals(shape.releaseNotes.isNullable(), true);
    assertEquals(shape.releaseNotes.isOptional(), true);
    const assetShape = UpdateReleaseAssetContract.shape;
    assertEquals(assetShape.size.isNullable(), true);
    assertEquals(assetShape.size.isOptional(), true);
    assertEquals(assetShape.contentType.isNullable(), true);
    assertEquals(assetShape.contentType.isOptional(), true);
    assertEquals(assetShape.digest.isNullable(), true);
    assertEquals(assetShape.digest.isOptional(), true);
  });

  it('exposes asset content type and digest as optional metadata', () => {
    const assetShape = UpdateReleaseAssetContract.shape as Record<
      string,
      unknown
    >;
    assertEquals('contentType' in assetShape, true);
    assertEquals('digest' in assetShape, true);
  });

  it('exposes the product and channel enums', () => {
    assertEquals(UpdateProductContract.options, [
      'ANITREND_APP',
      'ANITREND_V2',
    ]);
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

  it('exposes the decision status enum', () => {
    assertEquals(UpdateDecisionStatusContract.options, [
      'UP_TO_DATE',
      'UPDATE_AVAILABLE',
      'UNSUPPORTED',
    ]);
  });

  it('shapes the decision as a flat status plus optional release', () => {
    const shape = UpdateDecisionContract.shape;
    assertEquals(Object.keys(shape).sort(), ['release', 'status']);
    assertEquals(shape.release.isNullable(), true);
    assertEquals(shape.release.isOptional(), true);
  });
});

describe('UpdateQuerySchema', () => {
  it('does not default the product; only the channel defaults to STABLE', () => {
    const parsed = UpdateQuerySchema.safeParse({});
    assertEquals(parsed.success, true);
    if (parsed.success) {
      assertEquals(parsed.data.product, undefined);
      assertEquals(parsed.data.channel, 'STABLE');
    }
  });

  it('accepts every product and channel combination', () => {
    for (const product of ['ANITREND_APP', 'ANITREND_V2']) {
      for (const channel of ['STABLE', 'BETA', 'EXPERIMENTAL']) {
        assertEquals(
          UpdateQuerySchema.safeParse({ product, channel }).success,
          true,
        );
      }
    }
  });

  it('rejects unknown product and channel values', () => {
    assertEquals(
      UpdateQuerySchema.safeParse({ product: 'OTHER_APP' }).success,
      false,
    );
    assertEquals(
      UpdateQuerySchema.safeParse({ channel: 'FOO' }).success,
      false,
    );
  });

  it('rejects unknown query parameters', () => {
    assertEquals(
      UpdateQuerySchema.safeParse({
        product: 'ANITREND_APP',
        channel: 'STABLE',
        limit: '5',
      }).success,
      false,
    );
  });
});

describe('Update swagger exports', () => {
  it('re-exports the contract as the response swagger schema', () => {
    assertEquals(UpdateReleaseSwagger, UpdateReleaseContract);
    assertEquals(UpdateProductSwagger, UpdateProductContract);
    assertEquals(UpdateDecisionSwagger, UpdateDecisionContract);
    assertEquals(UpdateDecisionStatusSwagger, UpdateDecisionStatusContract);
  });

  it('wraps the query schema with a named title', () => {
    assertEquals(titleOf(UpdateQuerySwagger), 'UpdateQuery');
  });
});

import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { NotFoundException } from '@danet/core';
import { UpdatesController } from './updates.controller.ts';
import type { UpdatesService } from './updates.service.ts';
import type {
  UpdateChannel,
  UpdateProduct,
  UpdateRecord,
} from './updates.types.ts';

const createRecord = (
  product: UpdateProduct,
  channel: UpdateChannel,
): UpdateRecord => ({
  product,
  channel,
  tag: 'v2.4.0',
  name: 'Release 2.4.0',
  releaseNotes: null,
  publishedAt: 1_752_000_000_000,
  prerelease: false,
  htmlUrl: 'https://github.com/AniTrend/anitrend-app/releases/tag/v2.4.0',
  assets: [],
  code: 20400,
  version: '2.4.0',
  updatedAt: 1_752_000_000_000,
  etag: null,
});

const createController = (
  getUpdate: (
    product: UpdateProduct,
    channel: UpdateChannel,
  ) => Promise<UpdateRecord>,
) => {
  const service = { getUpdate } as unknown as UpdatesService;
  return new UpdatesController(service);
};

describe('UpdatesController', () => {
  it('defaults to the ANITREND_V2 product and STABLE channel', async () => {
    const getUpdate = spy(
      async (_product: UpdateProduct, _channel: UpdateChannel) =>
        createRecord('ANITREND_V2', 'STABLE'),
    );
    const controller = createController(getUpdate);

    const result = await controller.update({});

    assertEquals(result.code, 20400);
    assertSpyCalls(getUpdate, 1);
    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_V2');
    assertEquals(getUpdate.calls[0].args[1], 'STABLE');
  });

  it('passes explicit product and channel through without fallback', async () => {
    const getUpdate = spy(
      async (product: UpdateProduct, channel: UpdateChannel) =>
        createRecord(product, channel),
    );
    const controller = createController(getUpdate);

    const result = await controller.update({
      product: 'ANITREND_APP',
      channel: 'EXPERIMENTAL',
    });

    assertEquals(result.product, 'ANITREND_APP');
    assertEquals(result.channel, 'EXPERIMENTAL');
    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_APP');
    assertEquals(getUpdate.calls[0].args[1], 'EXPERIMENTAL');
  });

  it('passes every product/channel combination through', async () => {
    for (const product of ['ANITREND_APP', 'ANITREND_V2'] as const) {
      for (const channel of ['STABLE', 'BETA', 'EXPERIMENTAL'] as const) {
        const getUpdate = spy(
          async (p: UpdateProduct, c: UpdateChannel) => createRecord(p, c),
        );
        const controller = createController(getUpdate);

        await controller.update({ product, channel });

        assertEquals(getUpdate.calls[0].args[0], product);
        assertEquals(getUpdate.calls[0].args[1], channel);
      }
    }
  });

  it('defaults only the omitted parameter', async () => {
    const getUpdate = spy(
      async (product: UpdateProduct, channel: UpdateChannel) =>
        createRecord(product, channel),
    );
    const controller = createController(getUpdate);

    await controller.update({ channel: 'BETA' });

    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_V2');
    assertEquals(getUpdate.calls[0].args[1], 'BETA');
  });

  it('propagates NotFoundException from the service', async () => {
    const getUpdate = spy(
      async (_product: UpdateProduct, _channel: UpdateChannel) => {
        throw new NotFoundException();
      },
    );
    const controller = createController(getUpdate);

    await assertRejects(
      () => controller.update({ product: 'ANITREND_APP', channel: 'BETA' }),
      NotFoundException,
    );
  });
});

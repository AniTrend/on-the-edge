import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { NotFoundException } from '@danet/core';
import { UpdatesController } from './updates.controller.ts';
import type { UpdatesService } from './updates.service.ts';
import type { UpdateChannel, UpdateRecord } from './updates.types.ts';

const createRecord = (channel: UpdateChannel): UpdateRecord => ({
  channel,
  code: 42,
  version: '2.4.0',
  migration: true,
  minSdk: 26,
  releaseNotes: null,
  appId: 'com.anitrend.app',
  updatedAt: 1_752_000_000_000,
});

const createController = (
  getUpdate: (channel: UpdateChannel) => Promise<UpdateRecord>,
) => {
  const service = { getUpdate } as unknown as UpdatesService;
  return new UpdatesController(service);
};

describe('UpdatesController', () => {
  it('defaults to the STABLE channel when no channel query is provided', async () => {
    const getUpdate = spy(async (_channel: UpdateChannel) =>
      createRecord('STABLE')
    );
    const controller = createController(getUpdate);

    const result = await controller.update({});

    assertEquals(result.code, 42);
    assertSpyCalls(getUpdate, 1);
    assertEquals(getUpdate.calls[0].args[0], 'STABLE');
  });

  it('passes each explicit channel through', async () => {
    for (const channel of ['STABLE', 'BETA', 'EXPERIMENTAL'] as const) {
      const getUpdate = spy(async (_requested: UpdateChannel) =>
        createRecord(channel)
      );
      const controller = createController(getUpdate);

      const result = await controller.update({ channel });

      assertEquals(result.channel, channel);
      assertEquals(getUpdate.calls[0].args[0], channel);
    }
  });

  it('propagates NotFoundException from the service', async () => {
    const getUpdate = spy(async (_channel: UpdateChannel) => {
      throw new NotFoundException();
    });
    const controller = createController(getUpdate);

    await assertRejects(
      () => controller.update({ channel: 'EXPERIMENTAL' }),
      NotFoundException,
    );
  });
});

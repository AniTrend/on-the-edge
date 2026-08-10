import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { BadRequestException, type ExecutionContext } from '@danet/core';
import type { ClientContext } from '@scope/common/types';
import { UpdatesController } from './updates.controller.ts';
import type { UpdatesService } from './updates.service.ts';
import type {
  UpdateChannel,
  UpdateDecision,
  UpdateProduct,
} from './updates.types.ts';

const createClientContext = (
  overrides: Partial<ClientContext> = {},
): ClientContext => ({
  appId: 'ANITREND_V2',
  packageName: 'app.anitrend.v2',
  version: '2.4.0',
  versionCode: 20400,
  buildType: 'release',
  source: 'play',
  locale: 'en',
  platform: {
    browserName: null,
    browserVersion: null,
    cpuArchitecture: null,
    deviceModel: null,
    deviceVendor: null,
    deviceType: null,
    engineName: null,
    engineVersion: null,
    osName: null,
    osVersion: null,
    deviceBuildId: null,
  },
  ...overrides,
});

/**
 * Fake execution context carrying the canonical client attributes the
 * header middleware would have stored under 'client-attributes'.
 */
const createContext = (client?: ClientContext): ExecutionContext =>
  ({
    get: (key: string) => key === 'client-attributes' ? client : undefined,
  }) as unknown as ExecutionContext;

const createController = (
  getUpdate: (
    product: UpdateProduct,
    channel: UpdateChannel,
    clientVersionCode: number,
  ) => Promise<UpdateDecision>,
) => {
  const service = { getUpdate } as unknown as UpdatesService;
  return new UpdatesController(service);
};

describe('UpdatesController', () => {
  it('derives ANITREND_APP from the client context without a product query', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    const result = await controller.update(
      {},
      createContext(
        createClientContext({ appId: 'ANITREND_APP', versionCode: 20399 }),
      ),
    );

    assertEquals(result.status, 'UP_TO_DATE');
    assertSpyCalls(getUpdate, 1);
    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_APP');
    assertEquals(getUpdate.calls[0].args[1], 'STABLE');
    assertEquals(getUpdate.calls[0].args[2], 20399);
  });

  it('derives ANITREND_V2 from the client context without a blind default', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    await controller.update(
      {},
      createContext(createClientContext({ versionCode: 20500 })),
    );

    assertSpyCalls(getUpdate, 1);
    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_V2');
    assertEquals(getUpdate.calls[0].args[2], 20500);
  });

  it('accepts a product query matching the derived product', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    await controller.update(
      { product: 'ANITREND_APP', channel: 'EXPERIMENTAL' },
      createContext(createClientContext({ appId: 'ANITREND_APP' })),
    );

    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_APP');
    assertEquals(getUpdate.calls[0].args[1], 'EXPERIMENTAL');
  });

  it('rejects a product query mismatching the derived product', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    await assertRejects(
      () =>
        controller.update(
          { product: 'ANITREND_APP' },
          createContext(createClientContext({ appId: 'ANITREND_V2' })),
        ),
      BadRequestException,
    );
    assertSpyCalls(getUpdate, 0);
  });

  it('rejects a request without client context', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    await assertRejects(
      () => controller.update({}, createContext(undefined)),
      BadRequestException,
    );
    assertSpyCalls(getUpdate, 0);
  });

  it('passes an explicit channel through and defaults to STABLE when omitted', async () => {
    const getUpdate = spy(
      async (
        _product: UpdateProduct,
        _channel: UpdateChannel,
        _clientVersionCode: number,
      ) => ({ status: 'UP_TO_DATE' }) as UpdateDecision,
    );
    const controller = createController(getUpdate);

    await controller.update(
      { channel: 'BETA' },
      createContext(createClientContext({ appId: 'ANITREND_APP' })),
    );
    await controller.update(
      {},
      createContext(createClientContext({ appId: 'ANITREND_V2' })),
    );

    assertSpyCalls(getUpdate, 2);
    assertEquals(getUpdate.calls[0].args[0], 'ANITREND_APP');
    assertEquals(getUpdate.calls[0].args[1], 'BETA');
    assertEquals(getUpdate.calls[1].args[0], 'ANITREND_V2');
    assertEquals(getUpdate.calls[1].args[1], 'STABLE');
  });
});

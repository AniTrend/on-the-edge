import { describe, it } from '@std/testing/bdd';
import { assertSpyCall } from '@std/testing/mock';
import { spy } from '@std/testing/mock';
import { SeriesController } from './series.controller.ts';
import { SeriesService } from './series.service.ts';
import { createMockLogger } from '@scope/common/testing';

describe('SeriesController', () => {
  it('passes the client locale from request context into the service', async () => {
    const { logger } = createMockLogger();
    const aggregateSpy = spy(async () => ({}) as never);
    const service = { aggregate: aggregateSpy } as unknown as SeriesService;
    const controller = new SeriesController(service, logger);

    const query = { anilist: 789 };
    const context = {
      get: (key: string) => {
        if (key === 'client-attributes') {
          return {
            locale: 'en-US',
          };
        }

        return undefined;
      },
    };

    await (controller.series as (...args: unknown[]) => Promise<unknown>)(
      query,
      context,
    );

    assertSpyCall(aggregateSpy, 0, {
      args: [query, 'en-US'],
    });
  });

  it('calls the service with undefined locale when client attributes are missing', async () => {
    const { logger } = createMockLogger();
    const aggregateSpy = spy(async () => ({}) as never);
    const service = { aggregate: aggregateSpy } as unknown as SeriesService;
    const controller = new SeriesController(service, logger);

    const query = { anilist: 789 };
    const context = {
      get: () => undefined,
    };

    await (controller.series as (...args: unknown[]) => Promise<unknown>)(
      query,
      context,
    );

    assertSpyCall(aggregateSpy, 0, {
      args: [query, undefined],
    });
  });
});

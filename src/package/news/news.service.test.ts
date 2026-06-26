import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { NotFoundException } from '@danet/core';
import { NewsService } from './news.service.ts';
import type { ExperimentService } from '@scope/experiment';
import type { NewsRepository } from './news.repository.ts';
import type { PushService } from '../push/push.service.ts';
import { createMockLogger } from '@scope/common/testing';

class ExperimentStub implements Pick<ExperimentService, 'isEnabled'> {
  isEnabled(): boolean {
    return true;
  }
}

const pushService = {
  fanOutToNewsSubscribers: async () => {},
} as unknown as PushService;

describe('NewsService', () => {
  it('returns news items for provided locale', async () => {
    const repository = {
      feed: async () => [{ id: 'test', title: 'Test News' }],
    } as unknown as NewsRepository;
    const experiment = new ExperimentStub();
    const { logger } = createMockLogger();
    const service = new NewsService(
      logger,
      repository,
      experiment as unknown as ExperimentService,
      pushService,
    );

    const result = await service.feed({ locale: 'en' });
    assertEquals(result.length, 1);
    assertEquals(result[0].id, 'test');
  });

  it('fails when repository returns no data', async () => {
    const repository = {
      feed: async () => undefined,
    } as unknown as NewsRepository;
    const experiment = new ExperimentStub();
    const { logger } = createMockLogger();
    const service = new NewsService(
      logger,
      repository,
      experiment as unknown as ExperimentService,
      pushService,
    );

    await assertRejects(
      () => service.feed({ locale: 'en' }),
      NotFoundException,
    );
  });
});

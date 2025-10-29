import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { NotFoundException } from '@danet/core';
import { NewsService } from './news.service.ts';
import type { ExperimentService } from '@scope/experiment';
import type { NewsRepository } from './news.repository.ts';
import { createLoggerStub } from '@scope/logger/testing';

class ExperimentStub implements Pick<ExperimentService, 'isEnabled'> {
  isEnabled(): boolean {
    return true;
  }
}

describe('NewsService', () => {
  it('returns news items for provided locale', async () => {
    const repository = {
      feed: async () => [{ id: 'test', title: 'Test News' }],
    } as unknown as NewsRepository;
    const experiment = new ExperimentStub();
    const { logger } = createLoggerStub();
    const service = new NewsService(
      logger,
      repository,
      experiment as unknown as ExperimentService,
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
    const { logger } = createLoggerStub();
    const service = new NewsService(
      logger,
      repository,
      experiment as unknown as ExperimentService,
    );

    await assertRejects(
      () => service.feed({ locale: 'en' }),
      NotFoundException,
    );
  });
});

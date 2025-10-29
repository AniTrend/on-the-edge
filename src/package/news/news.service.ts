import { Injectable } from '@danet/core';
import { NotFoundException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { ExperimentService } from '@scope/experiment';
import { News, NewsPaging, NewsPagingQuery, NewsQuery } from './news.types.ts';
import { NewsRepository } from './news.repository.ts';

@Injectable()
export class NewsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly repository: NewsRepository,
    private readonly experiment: ExperimentService,
  ) {}

  async feed(query: NewsQuery): Promise<News[]> {
    const payload = await this.repository.feed(query);
    if (!payload) {
      this.logger.instance.warn(
        `Unable to locate news feed for locale ${query.locale}`,
      );
      throw new NotFoundException();
    }

    return payload;
  }

  async paging(query: NewsPagingQuery): Promise<NewsPaging> {
    const { before, after, limit } = query;

    if (!this.experiment.isEnabled('news-refactor-api')) {
      this.logger.instance.warn(
        'news-refactor-api experiment disabled',
      );
    }

    const payload = await this.repository.paging({ before, after, limit });
    if (!payload) {
      this.logger.instance.warn(
        `Unable to locate news feed for paging query ${JSON.stringify(query)}`,
      );
      throw new NotFoundException();
    }

    return payload;
  }
}

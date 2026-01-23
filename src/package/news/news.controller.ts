import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { NewsService } from './news.service.ts';
import type {
  News,
  NewsPaging,
  NewsPagingQuery,
  NewsQuery,
} from './news.types.ts';
import { NewsPagingQuerySchema, NewsQuerySchema } from './news.schema.ts';
import { NewsPagingSwagger, NewsSwagger } from './news.swagger.ts';
import { LoggerService } from '@scope/logger';

@Controller('v1')
export class NewsController {
  constructor(
    private readonly service: NewsService,
    private readonly logger: LoggerService,
  ) { }

  @Get('news/feed')
  @ReturnedSchema(NewsSwagger, true)
  async newsFeed(@Query(NewsQuerySchema) query: NewsQuery): Promise<News[]> {
    return this.service.feed(query);
  }

  @Get('news')
  @ReturnedSchema(NewsPagingSwagger)
  async news(
    @Query(NewsPagingQuerySchema) query: NewsPagingQuery,
  ): Promise<NewsPaging> {
    return this.service.paging(query);
  }
}

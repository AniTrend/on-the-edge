import { News } from '../types.d.ts';
import { latestNews } from '../service/index.ts';
import LocalSource from '../local/index.ts';
import { IPaging } from '../../common/types/paging.d.ts';
import { transform } from '../transformer.ts';
import { currentDate, isOlderThan } from '../../common/core/utils.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { parse } from 'x/xml';
import { logger } from '../../common/core/logger.ts';

export default class NewsRepository {
  constructor(
    private readonly local: LocalSource,
  ) {}

  sync = async () => {
    const latestDate = await this.local.getLatestPublishedDate();
    if (isOlderThan(currentDate(), latestDate, 4)) {
      const params = new URLSearchParams({
        locale: 'enGB',
      });
      const content = await latestNews(params);
      const document = parse(content, { flatten: true });
      const news = await transform(document);
      this.local.saveAll(news);
    } else {
      logger.info(
        'Not updating local source, cached instance is still valid',
      );
    }
  };

  getLatest = async (): Promise<IPaging<News>> => {
    const result = await this.local.getAll(1, 25);
    return result;
  };

  getLatestLegacy = async (): Promise<string> => {
    const params = new URLSearchParams({
      locale: 'enGB',
    });
    const result = await latestNews(params);
    return result;
  };

  getById = async (id: string): Promise<IResponse<News>> => {
    return await this.local.get(id);
  };
}

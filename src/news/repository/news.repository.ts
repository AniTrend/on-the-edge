import { News } from '../types.ts';
import { latestNews } from '@scope/service/news';
import LocalSource from '../local/news.local.source.ts';
import { IPaging } from '../../common/types/paging.ts';
import { transform } from '../transformer/news.transformer.ts';
import { currentDate, isOlderThan } from '../../common/core/utils.ts';
import { IResponse } from '../../common/types/response.ts';
import { parse } from '@xml';
import { logger } from '../../common/core/logger.ts';
import { NewsPagingParam } from '../local/types.ts';
import { between } from '@optic';

export class NewsRepository {
  constructor(
    private readonly local: LocalSource,
  ) {}

  sync = async (locale: string = 'en-US') => {
    const publishedOn = await this.local.getLatestPublishedDate();
    logger.mark('news_repository_sync_cache_start');
    if (isOlderThan(currentDate(), publishedOn, 4)) {
      const content = await latestNews(locale);
      const document = parse(content, { flatten: { attributes: true } });
      const news = transform(document);
      this.local.saveAll(news);
    } else {
      logger.debug(
        'news.repository.index:sync: Not updating local source, cached instance is still valid',
      );
    }
    logger.mark('news_repository_sync_cache_end');
    logger.measure(
      between('news_repository_cache_start', 'news_repository_cache_end'),
    );
  };

  getAllPaged = async (params: NewsPagingParam): Promise<IPaging<News>> => {
    logger.mark('news_repository_get_latest_start');
    const result = await this.local.getAllByParam(params);
    logger.mark('news_repository_get_latest_end');
    logger.measure(
      between(
        'news_repository_get_latest_start',
        'news_repository_get_latest_end',
      ),
    );
    return result;
  };

  getLatestLegacy = async (locale: string = 'en-US'): Promise<string> => {
    logger.mark('news_repository_get_latest_legacy_start');
    const result = await latestNews(locale);
    logger.mark('news_repository_get_latest_legacy_end');
    logger.measure(
      between(
        'news_repository_get_latest_legacy_start',
        'news_repository_get_latest_legacy_end',
      ),
    );
    return result;
  };

  getById = async (id: string): Promise<IResponse<News>> => {
    logger.mark('news_repository_get_by_id_start');
    const result = await this.local.get(id);
    logger.mark('news_repository_get_by_id_end');
    logger.measure(
      between(
        'news_repository_get_by_id_start',
        'news_repository_get_by_id_end',
      ),
    );
    return result;
  };
}

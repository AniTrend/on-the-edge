import { News } from '../types.d.ts';
import { latestNews } from '../service/index.ts';
import LocalSource from '../local/source.ts';
import { IPaging } from '../../common/types/paging.d.ts';
import { transform } from '../transformer.ts';
import { currentDate, isOlderThan } from '../../common/core/utils.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { parse } from 'x/xml';
import { logger } from '../../common/core/logger.ts';
import { NewsId } from '../local/types.d.ts';
import { between } from 'x/optic/profiler';

export default class NewsRepository {
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

  getLatest = async (id?: NewsId): Promise<IPaging<News>> => {
    logger.mark('news_repository_get_latest_start');
    const result = await this.local.getAll(id);
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

  getById = async (id: NewsId): Promise<IResponse<News>> => {
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

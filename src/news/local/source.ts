import { Collection, Filter, FindOptions, ObjectId, WithId } from 'npm/mongodb';
import { logger } from '../../common/core/logger.ts';
import { IPaging } from '../../common/types/paging.d.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { toDocument, toEntity } from '../mapper.ts';
import { News } from '../types.d.ts';
import { NewsDocument, NewsId } from './types.d.ts';
import { between } from 'x/optic/profiler';
import { projectionOf, sortOf } from '../../common/mongo/index.ts';

export default class LocalSource {
  constructor(
    private readonly collection?: Collection<NewsDocument>,
  ) {}

  saveAll = async (news: News[]) => {
    logger.mark('news_source_insertMany_start');
    const entities = news.map(toDocument);
    await this.collection?.insertMany(entities)
      .then((document) => {
        logger.debug(
          'news.local.source:saveAll: Saved documents',
          document.insertedCount,
        );
        logger.mark('news_source_insertMany_end');
      }).catch((e) => {
        logger.error(
          'news.local.source:saveAll: Unable to save news to collection',
          e,
        );
      }).finally(() => {
        logger.measure(
          between(
            'news_source_insertMany_start',
            'news_source_insertMany_end',
          ),
        );
      });
  };

  getLatestPublishedDate = async (): Promise<number> => {
    const filter: Filter<NewsDocument> = {
      id: { $exists: true },
    };
    const options: FindOptions<WithId<NewsDocument>> = {
      projection: projectionOf<NewsDocument>({ published_on: 1 }),
      sort: sortOf<NewsDocument>({ published_on: 'desc' }),
    };
    logger.mark('news_source_get_latest_published_date_start');
    return await this.collection
      ?.findOne(filter, options)
      ?.then((data) => {
        logger.mark('news_source_get_latest_published_date_end');
        return data?.published_on;
      })
      ?.catch((e) => {
        logger.error(
          'news.local.source:getLatestPublishedDate: Unable to fetch item',
          e,
        );
        return undefined;
      })
      ?.finally(() => {
        logger.measure(
          between(
            'news_source_get_latest_published_date_start',
            'news_source_get_latest_published_date_end',
          ),
        );
      }) ?? 0;
  };

  getAll = async (id?: NewsId): Promise<IPaging<News>> => {
    const filter: Filter<NewsDocument> = id
      ? {
        _id: { $gt: new ObjectId(id.cursor) },
      }
      : {};
    const options: FindOptions<WithId<NewsDocument>> = {
      sort: sortOf<NewsDocument>({ published_on: 'desc' }),
      limit: 25,
    };

    logger.mark('news_source_get_all_start');
    const documents = await this.collection?.find(filter, options)
      ?.toArray()
      ?.then((data) => {
        logger.mark('news_source_get_all_end');
        return data;
      })
      ?.catch((error) => {
        logger.warn(
          'news.local.source:getAll: Error fetching news collection',
          error,
        );
        return undefined;
      }).finally(() => {
        logger.measure(
          between('news_source_get_all_start', 'news_source_get_all_end'),
        );
      });

    const items = documents?.map(toEntity) ?? null;
    const count = items?.length ?? 0;

    let first, last: string | undefined = undefined;

    if (documents && count > 0) {
      first = documents[0]._id.toHexString();
      last = documents[count - 1]._id.toHexString();
    }

    return {
      count: count,
      first: first,
      last: last,
      data: items,
    };
  };

  get = async (
    id: NewsId,
  ): Promise<IResponse<News>> => {
    const filter: Filter<NewsDocument> = {
      slug: { $eq: id.uuid },
    };
    logger.mark('news_source_get_start');
    const document = await this.collection
      ?.findOne(filter)
      ?.then(() => {
        logger.mark('news_source_get_end');
      })
      ?.catch((error) => {
        logger.warn(
          'news.local.source:get: Error fetching news collection',
          error,
        );
        return undefined;
      }).finally(() => {
        logger.measure(
          between(
            'news_source_get_start',
            'news_source_get_end',
          ),
        );
      });

    if (document) {
      const item = toEntity(document);

      return {
        data: item ?? null,
      };
    }

    return {
      data: null,
    };
  };
}

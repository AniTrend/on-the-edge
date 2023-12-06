import { Collection } from 'x/mongo';
import { logger } from '../../common/core/logger.ts';
import { IPaging } from '../../common/types/paging.d.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { fromEntity, toEntity } from '../mapper.ts';
import { News } from '../types.d.ts';
import { NewsDocument } from './types.d.ts';

export default class LocalSource {
  constructor(
    private readonly collection?: Collection<NewsDocument>,
  ) {}

  saveAll = async (news: News[]) => {
    const entities = news.map(toEntity);
    await this.collection?.insertMany(
      entities,
    )
      .then((result) => {
        logger.debug('ObjectId', result);
      }).catch((e) => {
        logger.error('Unable to save news to collection', e);
        return undefined;
      });
  };

  getLatestPublishedDate = async (): Promise<number> => {
    const data = await this.collection
      ?.find({ project: ['published_on'] })
      .sort({ published_on: -1 })
      .limit(1)
      .next()
      .catch((e) => {
        logger.error(e);
        return undefined;
      });

    return data?.published_on ?? 0;
  };

  getAll = async (
    page: number,
    size: number,
  ): Promise<IPaging<News>> => {
    // const { from, to } = pagination(page, size);
    const count = await this.collection?.estimatedDocumentCount();

    const data = await this.collection?.find()
      .sort({
        published_on: { ascending: false },
      })
      .limit(page)
      .skip(size + page)
      .toArray()
      .then((data) => {
        logger.debug(
          `Retrieved ${data?.length} records from local source`,
        );
        return data;
      })
      .catch((error) => {
        logger.error(error);
        return undefined;
      });

    const items = data?.map(fromEntity);

    return {
      total: count ?? 0,
      count: items?.length ?? 0,
      page: page,
      data: items ?? null,
    };
  };

  get = async (
    id: string,
  ): Promise<IResponse<News>> => {
    const data = await this.collection
      ?.findOne({ id: { $eq: id } })
      .catch((error) => {
        logger.error(error);
        return undefined;
      });

    const item = fromEntity(data!);

    return {
      data: item ?? null,
    };
  };
}

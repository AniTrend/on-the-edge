import { logger } from '../_shared/core/logger.ts';
import { pagination } from '../_shared/core/utils.ts';
import { Client } from '../_shared/types/core.d.ts';
import { IPaging } from '../_shared/types/paging.d.ts';
import { IResponse } from '../_shared/types/response.d.ts';
import { fromEntity, toEntity } from './mapper.ts';
import { News } from './types.d.ts';

export default class LocalSource {
  private _client: Client;

  constructor(client: Client) {
    this._client = client;
  }

  saveAll = async (news: News[]) => {
    const entities = news.map(toEntity);
    const { error, count } = await this._client
      .from('anime_news')
      .upsert(entities);

    if (error) {
      logger.error(error);
    } else {
      logger.debug(`Inserted or updated ${count} items`);
    }
  };

  getLatestPublishedDate = async (): Promise<number> => {
    const { data, error } = await this._client.from('anime_news')
      .select('published_on')
      .order('published_on', { ascending: false })
      .limit(1);

    if (error) {
      logger.error(error);
    }

    return data?.at(0)?.published_on ?? 0;
  };

  getAll = async (
    page: number,
    size: number,
  ): Promise<IPaging<News>> => {
    const { from, to } = pagination(page, size);
    const { data, error, count } = await this._client
      .from('anime_news')
      .select('*', { count: 'exact' })
      .order('published_on', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error(error);
    } else {
      logger.debug(
        `Retrieved ${data?.length} records from local source`,
      );
    }

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
    const { data, error } = await this._client
      .from('anime_news')
      .select('*')
      .filter('id', 'eq', id)
      .limit(1);

    if (error) {
      logger.error(error);
    }

    const item = data?.map(fromEntity).at(0);

    return {
      data: item ?? null,
    };
  };
}

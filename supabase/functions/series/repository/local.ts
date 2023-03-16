import { logger } from '../../_shared/core/logger.ts';
import { Client } from '../../_shared/types/core.d.ts';
import { IResponse } from '../../_shared/types/response.d.ts';
import { SeriesRelation } from '../types.d.ts';
import { fromEntity } from './mapper.ts';

export default class LocalSource {
  constructor(
    private readonly client: Client,
  ) {}

  get = async (id: number): Promise<IResponse<SeriesRelation>> => {
    const { data, error } = await this.client
      .from('anime_relation')
      .select('*')
      .filter('anilist', 'eq', id)
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

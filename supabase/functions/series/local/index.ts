import { logger } from '../../_shared/core/logger.ts';
import { Client } from '../../_shared/types/core.d.ts';
import { IResponse } from '../../_shared/types/response.d.ts';
import { Media } from '../types.d.ts';
import { transformFromEntity } from './transformer.ts';

export default class LocalSource {
  constructor(
    private readonly client: Client,
  ) {}

  get = async (id: number): Promise<IResponse<Media>> => {
    const { data, error } = await this.client
      .from('anime_relation')
      .select('*')
      .filter('anilist', 'eq', id)
      .limit(1);

    if (error) {
      logger.error(error);
    }

    const item = data?.map(transformFromEntity).at(0);

    return {
      data: item ?? null,
    };
  };
}

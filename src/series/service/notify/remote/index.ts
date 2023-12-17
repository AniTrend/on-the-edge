import { env } from '../../../../common/core/env.ts';
import { request } from '../../../../common/core/request.ts';
import { Service } from '../../../../common/types/state.d.ts';
import { AnimeModel } from './types.d.ts';

const getService = (): Service => ({
  url: env<string>('NOTIFY'),
  credential: {},
});

export const getAnime = async (notify: string): Promise<AnimeModel> => {
  const service = getService();
  return await request(`${service.url}/anime/${notify}`);
};

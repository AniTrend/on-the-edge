import { env } from '../../../../_shared/core/env.ts';
import { request } from '../../../../_shared/core/request.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { AnimeModel } from './types.d.ts';

const getService = (): Service => ({
  url: env<string>('NOTIFY'),
  credential: {},
});

export const getAnime = async (notify: string): Promise<AnimeModel> => {
  const service = getService();
  return await request(`${service.url}/anime/${notify}`);
};

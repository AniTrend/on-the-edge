import { env } from '../../../../common/core/env.ts';
import { request } from '../../../../common/core/request.ts';
import { Service } from '../../../../common/types/state.ts';
import { SkyhookModel } from './types.ts';

const getService = (): Service => ({
  url: env<string>('SKYHOOK'),
  credential: {},
});

export const getShowByTvdb = async (id: number): Promise<SkyhookModel> => {
  const service = getService();
  return await request(
    `${service.url}/tvdb/shows/en/${id}`,
  );
};

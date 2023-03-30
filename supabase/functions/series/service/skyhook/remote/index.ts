import { env } from '../../../../_shared/core/env.ts';
import { request } from '../../../../_shared/core/request.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { SkyhookModel } from './types.d.ts';

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

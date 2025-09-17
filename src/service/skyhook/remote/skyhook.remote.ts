import { env } from '@scope/common/core';
import { request } from '@scope/common/core';
import { Service } from '@scope/common/types';
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

import { env } from '@scope/common/core';
import { logger } from '@scope/common/core';
import { request } from '@scope/common/core';
import { Service } from '@scope/common/types';
import { ThemeModel } from './types.ts';

const getService = (): Service => ({
  url: env<string>('THEMES'),
  credential: {},
});

export const getThemesByMalId = async (
  malId: number,
): Promise<ThemeModel[]> => {
  const service = getService();
  return await request<string>(`${service.url}/themes/${malId}`)
    .then((content) => {
      if (!content) {
        return [];
      }
      return JSON.parse(content);
    })
    .catch((e) => {
      logger.error('Unable to convert body to JSON', e);
      return [];
    });
};

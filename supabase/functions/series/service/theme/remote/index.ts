import { env } from '../../../../_shared/core/env.ts';
import { logger } from '../../../../_shared/core/logger.ts';
import { request } from '../../../../_shared/core/request.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { ThemeModel } from './types.d.ts';

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

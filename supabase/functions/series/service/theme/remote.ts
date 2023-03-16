import { request } from '../../../_shared/core/request.ts';
import { Service } from '../../../_shared/types/state.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';
import { ITheme, Theme } from './types.d.ts';
import { fromModel } from './mapper.ts';
import { logger } from '../../../_shared/core/logger.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  songs = async (malId: number): Promise<Theme[]> => {
    const url = `${this.service.url}/themes/${malId}`;
    const result = await request<string>(url);
    try {
      // because the API responds with application/text
      const themes: ITheme[] = JSON.parse(result);

      return fromModel(themes, url);
    } catch (e) {
      logger.error('Unable to convert body to JSON', e);
      return [];
    }
  };
}

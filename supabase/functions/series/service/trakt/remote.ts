import { Service } from '../../../_shared/types/state.d.ts';
import { defaults, request } from '../../../_shared/core/request.ts';
import { Show } from './types.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  show = async (tvdbId: number | string): Promise<Show> => {
    const params = new URLSearchParams({
      extended: 'full',
    });
    const result = await request<Show>(
      `${this.service.url}/shows/${tvdbId}?${params}`,
      {
        ...defaults,
        headers: {
          ...defaults.headers,
          'trakt-api-version': '2',
          'trakt-api-key': this.service.credential.id!,
        },
      },
    );
    return result;
  };
}

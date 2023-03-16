import { Service } from '../../../_shared/types/state.d.ts';
import { request } from '../../../_shared/core/request.ts';
import { Show } from './types.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  details = async (id: number): Promise<Show> => {
    const params = new URLSearchParams({
      api_key: this.service.credential.key!,
      language: 'en-US',
      append_to_response: 'images',
    });
    const result = await request<Show>(
      `${this.service.url}/tv/${id}?${params}`,
    );
    return result;
  };
}

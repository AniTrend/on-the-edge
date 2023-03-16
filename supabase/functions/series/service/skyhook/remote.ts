import { Service } from '../../../_shared/types/state.d.ts';
import { request } from '../../../_shared/core/request.ts';
import { Show } from './types.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  show = async (id: number): Promise<Show> => {
    const result = await request<Show>(
      `${this.service.url}/tvdb/shows/en/${id}`,
    );
    return result;
  };
}

import { request } from '../../../_shared/core/request.ts';
import { Service } from '../../../_shared/types/state.d.ts';
import { Anime, IAnime } from './types.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';
import { fromModel } from './mapper.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  anime = async (id: string): Promise<Anime> => {
    const result = await request<IAnime>(`${this.service.url}/anime/${id}`);
    return fromModel(result);
  };
}

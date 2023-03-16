import { Service } from '../../../_shared/types/state.d.ts';
import { request } from '../../../_shared/core/request.ts';
import { IAnimeResource, IMangaResource } from './types.d.ts';
import { Growth } from '../../../_shared/types/core.d.ts';
import { IResponse } from '../../../_shared/types/response.d.ts';
import { fromModel } from './mapper.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  anime = async (id: number): Promise<IAnimeResource> => {
    const result = await request<IResponse<IAnimeResource>>(
      `${this.service.url}/anime/${id}`,
    );
    return fromModel(result);
  };

  manga = async (id: number): Promise<IMangaResource> => {
    const result = await request<IResponse<IMangaResource>>(
      `${this.service.url}/manga/${id}`,
    );
    return fromModel(result);
  };
}

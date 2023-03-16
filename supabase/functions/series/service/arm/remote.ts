import { Service } from '../../../_shared/types/state.d.ts';
import { request } from '../../../_shared/core/request.ts';
import { Model, Relation, Relations } from './types.d.ts';
import { fromModel } from './mapper.ts';
import { Growth } from '../../../_shared/types/core.d.ts';

export default class RemoteSource {
  constructor(
    private readonly service: Service,
    private readonly growth: Growth,
  ) {}

  getRelation = async (
    anilist: number,
  ): Promise<Relation> => {
    const parms = new URLSearchParams({
      source: 'anilist',
      id: `${anilist}`,
    });
    const result = await request<Model>(
      `${this.service.url}/api/v2/ids?${parms}`,
    );
    return fromModel(result);
  };

  getRelations = async (
    tvdb: number,
  ): Promise<Relations> => {
    const parms = new URLSearchParams({
      id: `${tvdb}`,
    });
    const result = await request<Model[]>(
      `${this.service.url}/api/v2/thetvdb?${parms}`,
    );
    return result.map(fromModel);
  };
}

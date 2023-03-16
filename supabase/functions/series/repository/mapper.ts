import { SeriesRelation } from '../types.d.ts';
import { AnimeRelation } from './types.d.ts';

export const fromEntity = (
  entity: AnimeRelation,
): SeriesRelation => {
  return {
    ...entity,
    updated_at: '',
  };
};

export const toEntity = (model: unknown): unknown => {
  return {
    model,
  };
};

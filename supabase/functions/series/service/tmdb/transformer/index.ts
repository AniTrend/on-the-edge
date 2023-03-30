import { Transform } from '../../../transformer/types.d.ts';
import { Show } from '../remote/types.d.ts';
import { TmdbShow } from '../types.d.ts';

export const transform: Transform<Show, TmdbShow> = (sourceData) => ({
  ...sourceData,
});

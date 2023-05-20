import { Document } from 'https://deno.land/x/mongo@v0.31.2/mod.ts';
import { Transform } from '../../_shared/transformer/types.d.ts';
import { MediaWithSeason } from '../types.d.ts';

export const transform: Transform<Document, MediaWithSeason> = (
  sourceData,
) => {
  const { _id, ...rest } = sourceData;
  return rest as MediaWithSeason;
};

import { Document } from 'x/mongo';
import { Transform } from '../../common/transformer/types.d.ts';
import { MediaWithSeason } from '../types.d.ts';

export const transform: Transform<Document, MediaWithSeason> = (
  sourceData,
) => {
  const { _id, ...rest } = sourceData;
  return rest as MediaWithSeason;
};

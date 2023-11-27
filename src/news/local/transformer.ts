import { Document } from 'x/mongo';
import { Transform } from '../../common/transformer/types.d.ts';
import { News } from '../types.d.ts';

export const transform: Transform<Document, News> = (
  sourceData,
) => {
  const { _id, ...rest } = sourceData;
  return rest as News;
};

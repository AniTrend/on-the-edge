import { Document } from '@mongodb';
import { Transform } from '../../common/transformer/types.ts';
import { News } from '../types.ts';

export const transform: Transform<Document, News> = (
  sourceData,
) => {
  const { _id, ...rest } = sourceData;
  return rest as News;
};

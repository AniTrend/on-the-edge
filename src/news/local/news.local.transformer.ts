import { Document } from '@mongodb';
import { Transform } from '@scope/common/transformer';
import { News } from '../types.ts';

export const transform: Transform<Document, News> = (
  sourceData,
) => {
  const { _id, ...rest } = sourceData;
  return rest as News;
};

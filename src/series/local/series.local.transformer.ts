import { WithId } from '@mongodb';
import { Transform } from '../../common/transformer/types.ts';
import { MediaEntity } from '../types.ts';
import { idOf, Optional } from '../../common/mongo/index.ts';
import { MediaDocument } from './types.ts';

// Current schema only: assumes documents already conform to discriminated union shape.
const map = (document: WithId<MediaDocument>): MediaEntity => {
  const { _id, ...rest } = document;
  return {
    ...rest,
    id: idOf(_id),
  };
};

export const transform: Transform<
  Optional<WithId<MediaDocument>>,
  Optional<MediaEntity>
> = (sourceData) => sourceData ? map(sourceData) : undefined;

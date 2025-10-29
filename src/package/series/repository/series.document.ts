import { Document } from 'mongodb';
import { MediaUnion } from '../series.types.ts';
import { Instant } from '@scope/common/utils';

export type SeriesDocument = Document & MediaUnion & {
  seriesKey: string;
  updatedAt: Instant;
};

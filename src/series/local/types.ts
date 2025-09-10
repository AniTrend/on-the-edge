import { Document } from '@mongodb';
import { MediaUnion } from '../types.ts';

export type MediaDocument = Document & MediaUnion;

export interface MediaParamId {
  anilist: number;
}

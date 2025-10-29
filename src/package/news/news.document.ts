import type { WithId } from 'mongodb';
import { News } from './news.types.ts';

export type NewsDocument = News & {
  updatedAt: number;
};

export type NewsDocumentWithId = WithId<NewsDocument>;

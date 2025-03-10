import { Document } from '@mongodb';
import { EntityCursor } from '../../common/mongo/types.ts';

export interface NewsDocument extends Document {
  slug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  content: string;
  image: string;
  published_on: number;
  link: string;
}

export interface NewsPagingParam {
  before: EntityCursor;
  after: EntityCursor;
  limit: number | null;
}

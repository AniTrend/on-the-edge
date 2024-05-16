import { Document } from 'npm/mongodb';
import { EntityCursor } from '../../common/mongo/types.d.ts';

export interface NewsDocument extends Document {
  id: string;
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

export interface NewsId extends EntityCursor {
  uuid: string;
}

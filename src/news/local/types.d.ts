import { Document, ObjectId } from 'x/mongo';

export interface NewsDocument extends Document {
  _id: ObjectId;
  title: string;
  image: string;
  author: string;
  description: string;
  content: string;
  link: string;
  published_on: number;
}

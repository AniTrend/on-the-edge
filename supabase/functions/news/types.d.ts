import { Database } from '../_shared/types/supabase.d.ts';

export type News = {
  id: string;
  title: string;
  image: string;
  author: string;
  description: string;
  content: string;
  link: string;
  publishedOn: number;
};

export type NewsEntity = Pick<
  Database['public']['Tables']['anime_news']['Row'],
  | 'author'
  | 'content'
  | 'description'
  | 'image'
  | 'link'
  | 'published_on'
  | 'title'
  | 'id'
>;

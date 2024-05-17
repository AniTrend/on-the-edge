export type News = {
  slug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  content: string;
  image: string;
  publishedOn: number;
  link: string;
};

export type NewsEntity = News & { id: string };

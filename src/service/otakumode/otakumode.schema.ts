import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

export const ItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  'content:encoded': z.string(),
  pubDate: z.string().transform((date) => toInstant(date)),
  guid: z.string(),
  mainId: z.string(),
  category: z.string().nullish(),
  genre: z.string().nullish(),
  area: z.string().nullish(),
  lang: z.string().nullish(),
  'media:content': z
    .object({
      url: z.string().url(),
      type: z.string().nullish(),
      media: z.string().nullish(),
      width: z.string().nullish().transform((
        w,
      ) => (w ? Number(w) : undefined)),
      height: z.string().nullish().transform((
        h,
      ) => (h ? Number(h) : undefined)),
    })
    .nullish()
    .optional(),
  enclosure: z
    .object({
      img: z.string().url().nullish(),
    })
    .nullish()
    .optional(),
});

export const ChannelSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  author: z.string(),
  language: z.string(),
  'atom:link': z.object({
    'xmlns:atom': z.string().url(),
    rel: z.string(),
    href: z.string().url(),
    type: z.string(),
  }),
  item: z.array(ItemSchema).optional().default([]),
});

export const RssSchema = z.object({
  rss: z.object({
    channel: ChannelSchema,
  }),
});

import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

export const ItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  'content:encoded': z.string(),
  pubDate: z.string().transform((date) => {
    const instant = toInstant(date);
    return Number.isFinite(instant) ? instant : null;
  }),
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
      width: z.string().nullish().transform((width) => {
        if (typeof width !== 'string' || width.trim() === '') return undefined;
        const value = Number(width);
        return Number.isFinite(value) ? value : undefined;
      }),
      height: z.string().nullish().transform((height) => {
        if (typeof height !== 'string' || height.trim() === '') {
          return undefined;
        }
        const value = Number(height);
        return Number.isFinite(value) ? value : undefined;
      }),
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
  item: z.preprocess(
    (value) => {
      if (value === undefined) return [];
      if (Array.isArray(value)) return value;
      if (value !== null && typeof value === 'object') return [value];
      return value;
    },
    z.array(ItemSchema),
  ),
});

export const RssSchema = z.object({
  rss: z.object({
    channel: ChannelSchema,
  }),
});

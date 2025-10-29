import { z } from 'zod';

export const MirrorSchema = z.object({
  mirrorURL: z.string().url(),
  priority: z.number(),
  notes: z.string().nullish(),
});

export const ThemeMetaSchema = z.object({
  themeType: z.literal('OP').or(z.literal('ED')).or(z.string()),
  themeName: z.string(),
  mirror: MirrorSchema,
});

export const ThemeModelSchema = z.object({
  malID: z.number(),
  name: z.string(),
  year: z.number(),
  season: z.enum(['winter', 'spring', 'summer', 'fall']),
  themes: z.array(ThemeMetaSchema),
});

export const ThemeCollectionSchema = z.array(ThemeModelSchema);

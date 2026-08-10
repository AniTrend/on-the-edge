import { z } from 'zod';

const SettingsSchema = z.object({
  analyticsEnabled: z.boolean(),
  platformSource: z.string().url().optional(),
});

const ImageSchema = z.object({
  banner: z.string().url(),
  poster: z.string().url(),
  loading: z.string().url(),
  error: z.string().url(),
  info: z.string().url(),
  default: z.string().url(),
});

const NavigationItemSchema = z.object({
  key: z.string().min(1),
  criteria: z.string(),
  destination: z.string(),
  i18n: z.string(),
  icon: z.string(),
  group: z.object({
    authenticated: z.boolean(),
    i18n: z.string(),
  }),
});

const GenreSchema = z.object({
  name: z.string(),
  mediaId: z.number().min(1),
});

const PromotionActionSchema = z.object({
  type: z.literal('OPEN_URL'),
  url: z.string().url(),
});

const PromotionSchema = z.object({
  id: z.string(),
  targetProduct: z.enum(['ANITREND_V2']),
  title: z.string(),
  message: z.string(),
  action: PromotionActionSchema,
});

export const ConfigSchema = z.object({
  id: z.string(),
  settings: SettingsSchema,
  image: ImageSchema,
  navigation: z.array(NavigationItemSchema).default([]),
  genres: z.array(GenreSchema).default([]),
  promotion: PromotionSchema.nullable().optional(),
});

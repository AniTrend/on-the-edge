import { z } from 'zod';
import {
  AnimeThemeSchema,
  MirrorSchema,
  ThemeMetaSchema,
  ThemeModelSchema,
} from './theme.schema.ts';
import type { Theme } from './transformer/types.ts';

export type MirrorModel = z.infer<typeof MirrorSchema>;
export type ThemeMetaModel = z.infer<typeof ThemeMetaSchema>;
export type ThemeModel = z.infer<typeof ThemeModelSchema>;

export type AnimeTheme = z.infer<typeof AnimeThemeSchema>;
export type LegacyAnimeTheme = Theme;

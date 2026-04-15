import { z } from 'zod';
import {
  AnimeThemesAnimeSchema,
  AnimeThemesAudioSchema,
  AnimeThemesEntrySchema,
  AnimeThemesLookupSchema,
  AnimeThemesSongSchema,
  AnimeThemesThemeSchema,
  AnimeThemesVideoSchema,
} from './animethemes.schema.ts';

export type AnimeThemesLookup = z.infer<typeof AnimeThemesLookupSchema>;
export type AnimeThemesAnimeModel = z.infer<typeof AnimeThemesAnimeSchema>;
export type AnimeThemesThemeModel = z.infer<typeof AnimeThemesThemeSchema>;
export type AnimeThemesEntryModel = z.infer<typeof AnimeThemesEntrySchema>;
export type AnimeThemesVideoModel = z.infer<typeof AnimeThemesVideoSchema>;
export type AnimeThemesAudioModel = z.infer<typeof AnimeThemesAudioSchema>;
export type AnimeThemesSongModel = z.infer<typeof AnimeThemesSongSchema>;

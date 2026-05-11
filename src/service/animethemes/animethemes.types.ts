import { z } from 'zod';
import {
  AnimeThemesResourceSchema,
  AnimeThemesAudioSchema,
  AnimeThemesEntrySchema,
  AnimeThemesLookupSchema,
  AnimeThemesSongSchema,
  AnimeThemesSchema,
  AnimeThemesVideoSchema,
} from './animethemes.schema.ts';

export type AnimeThemesLookupModel = z.infer<typeof AnimeThemesLookupSchema>;
export type AnimeThemesResourceModel = z.infer<typeof AnimeThemesResourceSchema>;
export type AnimeThemesModel = z.infer<typeof AnimeThemesSchema>;
export type AnimeThemesEntryModel = z.infer<typeof AnimeThemesEntrySchema>;
export type AnimeThemesVideoModel = z.infer<typeof AnimeThemesVideoSchema>;
export type AnimeThemesAudioModel = z.infer<typeof AnimeThemesAudioSchema>;
export type AnimeThemesSongModel = z.infer<typeof AnimeThemesSongSchema>;

import { z } from 'zod';

export const TheXemSceneSchema = z.object({
  season: z.number(),
  episode: z.number(),
  absolute: z.number(),
});

export const TheXemEntrySchema = z.object({
  scene: TheXemSceneSchema,
  tvdb: TheXemSceneSchema,
  anidb: TheXemSceneSchema,
});

export const TheXemResponseSchema = z.object({
  result: z.string().optional(),
  message: z.string().optional(),
  data: z.array(TheXemEntrySchema).default([]),
});

export type TheXemRemoteEntry = z.infer<typeof TheXemEntrySchema>;

import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { TheXemEntrySchema } from './thexem.schema.ts';

describe('TheXemEntrySchema', () => {
  const entryWithoutAniDb = {
    scene: { season: 1, episode: 1, absolute: 1 },
    tvdb: { season: 1, episode: 1, absolute: 1 },
  };

  it('accepts omitted AniDB data but rejects explicit null', () => {
    assertEquals(TheXemEntrySchema.safeParse(entryWithoutAniDb).success, true);
    assertEquals(
      TheXemEntrySchema.safeParse({ ...entryWithoutAniDb, anidb: null })
        .success,
      false,
    );
  });

  it('still requires scene and TVDB coordinates', () => {
    assertEquals(
      TheXemEntrySchema.safeParse({ tvdb: entryWithoutAniDb.tvdb }).success,
      false,
    );
    assertEquals(
      TheXemEntrySchema.safeParse({ scene: entryWithoutAniDb.scene }).success,
      false,
    );
  });
});

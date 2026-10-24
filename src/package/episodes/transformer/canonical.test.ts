import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { AnimeEpisodeSchema } from '@scope/service/jikan';
import { toCanonicalEpisode } from './canonical.ts';

describe('toCanonicalEpisode', () => {
  it('uses the normalized episode date and converts upstream seconds to minutes once', () => {
    const parsed = AnimeEpisodeSchema.parse({
      mal_id: 7,
      title: 'Episode 7',
      aired: '1970-01-01T00:00:02.999Z',
      duration: 90,
    });

    const canonical = toCanonicalEpisode(parsed);

    assertEquals(canonical.aired, 2);
    assertEquals(canonical.duration, 1.5);
  });

  it('preserves epoch zero and a zero duration', () => {
    const parsed = AnimeEpisodeSchema.parse({
      mal_id: 8,
      title: 'Episode 8',
      aired: '1970-01-01T00:00:00Z',
      duration: 0,
    });

    const canonical = toCanonicalEpisode(parsed);

    assertEquals(canonical.aired, 0);
    assertEquals(canonical.duration, 0);
  });
});

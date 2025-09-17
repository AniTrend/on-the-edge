import { assertEquals } from '@std/assert';
import { toCanonicalFromTrakt } from './episode.transformer.ts';
import { EpisodeModel } from '@scope/service/trakt';

Deno.test('toCanonicalFromTrakt maps Trakt episode to EpisodeCanonical', () => {
  const src: EpisodeModel = {
    season: 1,
    number: 3,
    title: 'Episode 3',
    overview: 'Overview',
    first_aired: '2020-01-03T00:00:00.000Z',
    runtime: 24,
    ids: {
      trakt: 1003,
      tvdb: 2003,
      tmdb: 3003,
      imdb: 'tt123',
    },
    after_credits: false,
    during_credits: false,
  };
  const got = toCanonicalFromTrakt(src);
  assertEquals(got.id, 1003);
  assertEquals(got.number, 3);
  assertEquals(got.title?.english, 'Episode 3');
  assertEquals(got.synopsis, 'Overview');
  // Expect Instant (seconds) epoch timestamp, should be asserted
  assertEquals(typeof got.aired, 'number');
  assertEquals(got.duration, 24);
  assertEquals(got.kind, 'main');
});

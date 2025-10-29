import { assert, assertEquals } from '@std/assert';
import { applyEpisodeLimit, classifyEpisodeKind } from './episode-utils.ts';
import type { AnimeEpisode } from './jikan.types.ts';

const sample = (overrides: Partial<AnimeEpisode> = {}): AnimeEpisode => ({
  mal_id: overrides.mal_id ?? 1,
  url: 'u',
  title: overrides.title ?? 'Title',
  title_japanese: null,
  title_romanji: null,
  duration: null,
  aired: null,
  filler: overrides.filler ?? false,
  recap: overrides.recap ?? false,
  synopsis: null,
  score: overrides.score ?? null,
  kind: overrides.kind ?? 'main',
});

Deno.test('applyEpisodeLimit returns truncated slice when over max', () => {
  const episodes = Array.from(
    { length: 5 },
    (_, i) => sample({ mal_id: i + 1 }),
  );
  const { episodes: limited, truncated } = applyEpisodeLimit(episodes, {
    max: 3,
  });
  assertEquals(limited.length, 3);
  assert(truncated);
});

Deno.test('applyEpisodeLimit applies window bounds', () => {
  const episodes = Array.from(
    { length: 10 },
    (_, i) => sample({ mal_id: i + 1 }),
  );
  const { episodes: filtered, truncated } = applyEpisodeLimit(episodes, {
    window: { from: 4, to: 6 },
  });
  assertEquals(filtered.map((e) => e.mal_id), [4, 5, 6]);
  assertEquals(truncated, false);
});

Deno.test('classifyEpisodeKind identifies filler and recap', () => {
  assertEquals(classifyEpisodeKind(sample({ filler: true })), 'filler');
  assertEquals(classifyEpisodeKind(sample({ recap: true })), 'recap');
  assertEquals(classifyEpisodeKind(sample({ title: 'OVA Special' })), 'ova');
  assertEquals(classifyEpisodeKind(sample({ title: 'ONA Feature' })), 'ona');
  assertEquals(classifyEpisodeKind(sample({})), 'main');
});

import { assertEquals } from '@std/assert';
import { mergeEpisodes } from './merge.ts';
import { EpisodeSourceSlice } from './types.ts';
import { toCanonicalEpisode } from '../episodes.types.ts';

Deno.test('mergeEpisodes passthrough JIKAN ordering by id', () => {
  const input: EpisodeSourceSlice[] = [{
    source: 'JIKAN',
    episodes: [
      toCanonicalEpisode({ mal_id: 3, themes: { openings: [], endings: [] } }),
      toCanonicalEpisode({ mal_id: 1, themes: { openings: [], endings: [] } }),
      toCanonicalEpisode({ mal_id: 2, themes: { openings: [], endings: [] } }),
    ],
  }];
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, input);
  const ids = res.episodes.map((e) => e.id);
  assertEquals(ids, [1, 2, 3]);
});

Deno.test('mergeEpisodes empty input returns empty result', () => {
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, []);
  assertEquals(res.episodes.length, 0);
});

Deno.test('mergeEpisodes detects title conflict between sources', () => {
  const jikan = {
    source: 'JIKAN' as const,
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Episode One',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const skyhook = {
    source: 'SKYHOOK' as const,
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Ep 1 - Pilot',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, [jikan, skyhook]);
  assertEquals(res.episodes.length, 1);
  const ep = res.episodes[0];
  // Expect both sources present
  assertEquals(ep.sources?.sort(), ['JIKAN', 'SKYHOOK']);
  // Expect title conflict since normalized titles differ
  assertEquals(ep.conflictReasons?.includes('TITLE'), true);
});

Deno.test('mergeEpisodes includes orphan episode from secondary source', () => {
  const jikan = {
    source: 'JIKAN' as const,
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Episode One',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const skyhook = {
    source: 'SKYHOOK' as const,
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Episode One',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 2,
        title: 'Episode Two (Alt)',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, [jikan, skyhook]);
  assertEquals(res.episodes.length, 2);
  const orphan = res.episodes.find((e) => e.id === 2)!;
  assertEquals(orphan.conflictReasons?.includes('ORPHAN'), true);
  assertEquals(orphan.sources, ['SKYHOOK']);
});

Deno.test('mergeEpisodes aligns by near air date when numbers differ', () => {
  // Primary has ep 1 aired on day X; secondary has different number (5) but same day
  const day = new Date('2020-01-05T00:00:00Z').toISOString();
  const jikan: EpisodeSourceSlice = {
    source: 'JIKAN',
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Pilot',
        aired: day,
        duration: 24,
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 2,
        title: 'Next',
        aired: new Date('2020-01-12T00:00:00Z').toISOString(),
        duration: 24,
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const skyhook: EpisodeSourceSlice = {
    source: 'SKYHOOK',
    episodes: [
      toCanonicalEpisode({
        mal_id: 5,
        title: 'Pilot',
        aired: day,
        duration: 24,
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, [jikan, skyhook]);
  // Should have 2 episodes total, and the first episode should include SKYHOOK source due to alignment
  const ep1 = res.episodes.find((e) => e.id === 1)!;
  assertEquals(ep1.sources?.includes('SKYHOOK'), true);
});

Deno.test('mergeEpisodes aligns by normalized title when numbers differ', () => {
  const jikan: EpisodeSourceSlice = {
    source: 'JIKAN',
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Episode 01',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const skyhook: EpisodeSourceSlice = {
    source: 'SKYHOOK',
    episodes: [
      toCanonicalEpisode({
        mal_id: 9,
        title: 'Episode-01',
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, [jikan, skyhook]);
  const ep1 = res.episodes.find((e) => e.id === 1)!;
  assertEquals(ep1.sources?.includes('SKYHOOK'), true);
});

Deno.test('mergeEpisodes detects duration and air-date conflicts', () => {
  const jikan: EpisodeSourceSlice = {
    source: 'JIKAN',
    episodes: [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Pilot',
        aired: '2020-01-05T00:00:00Z',
        duration: 24,
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const skyhook: EpisodeSourceSlice = {
    source: 'SKYHOOK',
    episodes: [
      // Different duration by >2 and air date drift >2 days
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Pilot',
        aired: '2020-01-10T00:00:00Z',
        duration: 28,
        themes: { openings: [], endings: [] },
      }),
    ],
  };
  const res = mergeEpisodes({ preferRuntime: 'JIKAN' }, [jikan, skyhook]);
  const ep1 = res.episodes[0];
  const reasons = ep1.conflictReasons ?? [];
  assertEquals(reasons.includes('DURATION'), true);
  assertEquals(reasons.includes('AIR_DATE'), true);
});

Deno.test('mergeEpisodes aligns by fuzzy title similarity when numbers differ and no air-dates', () => {
  const a = [
    toCanonicalEpisode({
      mal_id: 1,
      title: 'The Beginning',
      aired: null,
      themes: { openings: [], endings: [] },
    }),
  ];
  const b = [
    toCanonicalEpisode({
      mal_id: 5,
      title: 'Beginning',
      aired: null,
      themes: { openings: [], endings: [] },
    }),
  ];
  const res = mergeEpisodes(
    { preferRuntime: 'JIKAN', titleSimThreshold: 0.7 },
    [
      { source: 'JIKAN', episodes: a },
      { source: 'SKYHOOK', episodes: b },
    ],
  );
  // Should align SKYHOOK ep (id 5) to JIKAN ep (id 1), resulting in one merged episode
  assertEquals(res.episodes.length, 1);
  const ep = res.episodes[0];
  assertEquals(ep.id, 1);
  assertEquals(ep.sources?.includes('SKYHOOK'), true);
});

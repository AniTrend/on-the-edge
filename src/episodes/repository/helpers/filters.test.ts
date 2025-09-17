import { applyFilters, type EpisodeFilters } from './filters.ts';
import type { EpisodeCanonical } from '../../episodes.types.ts';

const ep = (n: number, kind: EpisodeCanonical['kind']): EpisodeCanonical => ({
  id: n,
  number: n,
  title: { english: `E${n}`, native: null, romanji: null },
  synopsis: null,
  aired: null,
  score: null,
  kind,
  duration: null,
  url: null,
  themes: { openings: [], endings: [] },
  tvdbShowId: null,
  tvdbId: null,
  tmdbId: null,
  seasonNumber: null,
  episodeNumber: null,
  absoluteEpisodeNumber: null,
  airedBeforeSeasonNumber: null,
  airedBeforeEpisodeNumber: null,
  airedAfterSeasonNumber: null,
  airedAfterEpisodeNumber: null,
  image: null,
  poster: null,
});

Deno.test('applyFilters: kind filter matches only specified kind', () => {
  const episodes: EpisodeCanonical[] = [
    ep(1, 'main'),
    ep(2, 'ova'),
    ep(3, 'recap'),
  ];
  const f: EpisodeFilters = { kind: 'main' };
  const res = applyFilters(episodes, f);
  if (res.length !== 1 || res[0].id !== 1) {
    throw new Error(
      `expected only main episode id=1, got ${
        res.map((e: EpisodeCanonical) => e.id).join(',')
      }`,
    );
  }
});

Deno.test('applyFilters: specialsOnly excludes main and includes special-like kinds', () => {
  const episodes: EpisodeCanonical[] = [
    ep(1, 'main'),
    ep(2, 'ova'),
    ep(3, 'ona'),
    ep(4, 'recap'),
    ep(5, 'filler'),
    ep(6, 'special'),
  ];
  const res = applyFilters(episodes, { specialsOnly: true });
  const ids = res.map((e: EpisodeCanonical) => e.id).join(',');
  if (ids !== '2,3,4,5,6') {
    throw new Error(`expected specials [2..6] excluding main, got [${ids}]`);
  }
});

Deno.test('applyFilters: numeric range (inclusive) by episode number', () => {
  const episodes: EpisodeCanonical[] = [
    ep(1, 'main'),
    ep(2, 'main'),
    ep(3, 'main'),
    ep(4, 'main'),
    ep(5, 'main'),
  ];
  const res = applyFilters(episodes, { start: 2, end: 4 });
  const ids = res.map((e: EpisodeCanonical) => e.id).join(',');
  if (ids !== '2,3,4') {
    throw new Error(`expected [2,3,4], got [${ids}]`);
  }
});

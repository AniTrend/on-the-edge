import { assert, assertEquals } from '@std/assert';
import {
  deriveSeasonScope,
  helpers as scopeHelpers,
} from '../../helpers/scope.ts';
import type { EpisodeCanonical } from '../../episodes.types.ts';
import { toInstant } from '@scope/common/helpers';
import type { SkyhookShow } from '@scope/service/skyhook';

const canon = (
  id: number,
  title: string,
  aired: number | null,
): EpisodeCanonical => ({
  id,
  number: id,
  title: { english: title, native: null, romanji: title },
  synopsis: null,
  aired,
  score: null,
  kind: 'main',
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

const sky = (
  tvdbId: number,
  e: Array<{ s: number; n: number; title: string; aired?: Date | null }>,
): SkyhookShow => ({
  tvdbId,
  title: 'Show',
  overview: '',
  slug: 'show',
  originalCountry: 'JP',
  originalLanguage: 'ja',
  language: 'ja',
  firstAired: 0,
  lastAired: new Date(),
  tvMazeId: 0,
  tmdbId: 0,
  malIds: [],
  aniListIds: [],
  lastUpdated: 0,
  status: 'Ended',
  runtime: 24,
  timeOfDay: { hours: 0, minutes: 0 },
  originalNetwork: 'TV',
  network: 'TV',
  genres: [],
  contentRating: 'PG',
  rating: { count: 0, value: '0' },
  alternativeTitles: { title: 'Show' },
  imdbId: '',
  actors: [],
  images: [],
  seasons: [],
  episodes: e.map((x, i) => ({
    tvdbShowId: tvdbId,
    tvdbId: 100 + i,
    title: x.title,
    overview: '',
    seasonNumber: x.s,
    episodeNumber: x.n,
    absoluteEpisodeNumber: undefined,
    airDate: x.aired ?? new Date(0),
    airDateUtc: x.aired ?? new Date(0),
    finaleType: undefined,
    airedBeforeSeasonNumber: undefined,
    airedAfterSeasonNumber: undefined,
    runtime: 24,
  })),
});

Deno.test('deriveSeasonScope matches by title-only when air dates missing', () => {
  const canonical: EpisodeCanonical[] = [
    canon(1, 'Episode 01', null),
    canon(2, 'Episode 02', null),
  ];
  const s = sky(123, [
    { s: 1, n: 1, title: 'Episode-01' },
    { s: 1, n: 2, title: 'Episode-02' },
  ]);
  const { pairs, stats } = deriveSeasonScope(canonical, s, undefined);
  assertEquals(pairs, [{ season: 1, episode: 1 }, { season: 1, episode: 2 }]);
  assert(stats.fuzzyMatches >= 2);
});

Deno.test('deriveSeasonScope matches by near air date and equal title', () => {
  const canonical: EpisodeCanonical[] = [
    canon(1, 'Pilot', toInstant(new Date('2020-01-01T00:00:00Z'))),
  ];
  const s = sky(123, [
    { s: 1, n: 5, title: 'Pilot', aired: new Date('2020-01-01T00:00:00Z') },
  ]);
  const { pairs } = deriveSeasonScope(canonical, s, undefined);
  assertEquals(pairs, [{ season: 1, episode: 5 }]);
});

Deno.test('normalizeTitle reduces strings consistently', () => {
  assertEquals(scopeHelpers.normalizeTitle('Episode-01'), 'episode01');
});

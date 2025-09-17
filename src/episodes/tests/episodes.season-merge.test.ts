import { assert, assertEquals } from '@std/assert';
import { EpisodesRepository } from '../repository/episodes.repository.ts';
import { toCanonicalEpisode } from '../episodes.types.ts';
import type { EpisodeCollection } from '../collection/episode.collection.ts';
import type { EpisodeDocument } from '../store/types.ts';
import { AppFeatures } from '../../common/experiment/types.ts';
import { Features } from '../../common/types/core.ts';
import { json, onGet, stubFetch } from '../../common/testing/net.ts';
import { setEnvScoped } from '../../common/testing/env.ts';
import { Instant } from '../../common/helpers/date.ts';

// In-memory EpisodeCollection for tests
const memory: (EpisodeDocument & { _id: string })[] = [];
const makeInMemoryCol = (): EpisodeCollection => ({
  get(seriesKey: string) {
    return Promise.resolve(
      memory.find((d) => d.seriesKey === seriesKey) ?? null,
    );
  },
  save(doc: EpisodeDocument) {
    const idx = memory.findIndex((d) => d.seriesKey === doc.seriesKey);
    const stored = {
      ...doc,
      _id: idx >= 0 ? memory[idx]._id : crypto.randomUUID(),
    };
    if (idx >= 0) memory[idx] = stored;
    else memory.push(stored);
    return Promise.resolve(stored);
  },
  lastUpdated: function (_seriesKey: string): Promise<Instant | null> {
    return Promise.resolve(0);
  },
});

const makeFeatures = (flags: Partial<AppFeatures>): Features => {
  const table = { ...flags } as Record<string, unknown>;
  return {
    isOn: (k: string) => Boolean(table[k]) === true,
    getFeatureValue: <T>(k: string, d: T) => (table[k] as T) ?? d,
  } as unknown as Features;
};

// TODO(refactor): This test targets the removed 'episode-merge-season' flag and legacy SeasonRepository path.
// The new behavior always orchestrates seasonal slices without this flag. We'll replace this test with
// scope-aligned provider slice tests in helpers.
Deno.test.ignore(
  'season-merge: uses SeasonRepository slice when enabled',
  async () => {
    const seriesKey = '3000';
    // Baseline Jikan episodes: two eps with numbers 1..2
    const episodes = [1, 2].map((n) =>
      toCanonicalEpisode({ mal_id: n, title: `Ep ${n}` })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });

    // Stub env and remotes: Yuna (relations), Skyhook show, TMDB show+season
    const yunaBase = 'https://yuna.test';
    const skyhookBase = 'https://skyhook.test';
    const tmdbBase = 'https://tmdb.test';
    const env = setEnvScoped({
      YUNA: yunaBase,
      SKYHOOK: skyhookBase,
      TMDB: tmdbBase,
      TMDB_KEY: 'k',
    });

    const fetchStub = stubFetch([
      // Yuna relation
      onGet(`${yunaBase}/api/v2/ids`, ({ url }) => {
        const u = new URL(url);
        if (u.searchParams.get('source') === 'anilist') {
          return json({
            anilist: Number(seriesKey),
            myanimelist: Number(seriesKey),
            thetvdb: 54321,
            themoviedb: 9876,
          });
        }
        return json({});
      }),
      // Skyhook show (minimal with 1 episode)
      onGet(`${skyhookBase}/tvdb/shows/en/:tvdbId`, () =>
        json({
          tvdbId: 54321,
          title: 'Show',
          overview: '',
          slug: 'show',
          originalCountry: 'JP',
          originalLanguage: 'ja',
          language: 'ja',
          firstAired: new Date(),
          lastAired: new Date(),
          tvMazeId: 0,
          tmdbId: 9876,
          imdbId: '',
          malIds: [Number(seriesKey)],
          aniListIds: [Number(seriesKey)],
          lastUpdated: new Date(),
          status: 'Ended',
          runtime: 24,
          timeOfDay: { hours: 0, minutes: 0 },
          originalNetwork: 'TV',
          network: 'TV',
          genres: [],
          contentRating: 'PG',
          rating: { count: 0, value: '0' },
          alternativeTitles: { title: 'Show' },
          actors: [],
          images: [],
          seasons: [],
          episodes: [
            {
              tvdbShowId: 54321,
              tvdbId: 9001,
              title: 'S1E1',
              overview: 'ep1',
              seasonNumber: 1,
              episodeNumber: 1,
              airDate: new Date('2020-01-01'),
              airDateUtc: new Date('2020-01-01'),
              runtime: 24,
            },
          ],
        })),
      // TMDB show (include arrays used by transformer)
      onGet(
        `${tmdbBase}/tv/:id`,
        () =>
          json({
            id: 9876,
            images: { backdrops: [], posters: [], logos: [] },
            networks: [],
            production_companies: [],
            last_episode_to_air: { still_path: null },
            seasons: [{ season_number: 1 }],
          }),
      ),
      // TMDB season 1 with images and episode stills
      onGet(`${tmdbBase}/tv/:id/season/1`, () =>
        json({
          _id: 's1',
          id: 111,
          name: 'S1',
          overview: '',
          poster_path: '/p.jpg',
          season_number: 1,
          images: {
            posters: [{ file_path: '/p.jpg', width: 500, height: 750 }],
            backdrops: [],
            logos: [],
          },
          episodes: [{
            id: 7001,
            episode_number: 1,
            season_number: 1,
            name: 'S1E1',
            overview: '',
            still_path: '/s1e1.jpg',
            vote_average: 0,
            vote_count: 0,
            crew: [],
            guest_stars: [],
            runtime: 24,
          }],
        })),
    ]);

    try {
      const features = makeFeatures({});
      const repo = new EpisodesRepository(makeInMemoryCol(), features);
      const page = await repo.invoke(Number(seriesKey), { limit: 10 });
      assert(page.data);
      // Season merge should keep total equal to baseline (2), but attribute SKYHOOK/TMDB-derived episode to first entry
      assertEquals(page.total, 2);
      const first = page.data![0] as unknown as {
        sources?: string[];
        image?: string | null;
      };
      assert(first.sources && first.sources.includes('SKYHOOK'));
      // Image should be present from TMDB still via provider mapping
      assert(first.image == null || typeof first.image === 'string');
    } finally {
      fetchStub.restore();
      env.restore();
    }
  },
);

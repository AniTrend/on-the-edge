import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { animeTransform } from './jikan.transformer.ts';
import type { AnimeEpisode, AnimeResource } from '../jikan.types.ts';
import { toInstant } from '@scope/common/utils';

describe('jikan anime transformer', () => {
  const episodes: AnimeEpisode[] = [
    {
      mal_id: 1,
      url: 'https://example.test/ep/1',
      title: 'Ep 1',
      title_japanese: '第1話',
      title_romanji: 'Dai 1 Wa',
      duration: 24,
      aired: toInstant('2024-01-01T00:00:00+00:00'),
      filler: false,
      recap: false,
      synopsis: 'Pilot',
      score: null,
      kind: 'main',
    },
  ];
  const resource: AnimeResource = {
    mal_id: 100,
    url: 'https://example.test/anime/100',
    approved: true,
    titles: [{ type: 'Default', title: 'Sample' }],
    images: {
      jpg: { image_url: null, small_image_url: null, large_image_url: null },
      webp: { image_url: null, small_image_url: null, large_image_url: null },
    },
    title: 'Sample',
    title_english: null,
    title_japanese: null,
    title_synonyms: [],
    type: 'TV',
    score: 0,
    scored_by: 0,
    rank: 0,
    popularity: 0,
    members: 0,
    favorites: 0,
    synopsis: null,
    background: null,
    trailer: null,
    source: 'Original',
    episodes: 1,
    status: 'Finished Airing',
    airing: false,
    aired: {
      from: null,
      to: null,
      prop: {
        from: { day: null, month: null, year: null },
        to: { day: null, month: null, year: null },
        string: null,
      },
    },
    duration: null,
    season: null,
    year: null,
    producers: [],
    licensors: [],
    studios: [],
    genres: [],
    explicit_genres: [],
    themes: [],
    demographics: [],
    relations: [],
    external: [],
    streaming: [],
    episodes_list: episodes,
    rating: null,
    moreinfo: null,
    episodes_truncated: false,
    broadcast: {
      day: 'Mondays',
      time: '02:00',
      timezone: 'Asia/Tokyo',
      string: 'Monday at 02:00 (Asia/Tokyo)',
    },
    theme: null,
  };

  it('transforms with extra info', () => {
    const transformed = animeTransform({ ...resource, moreinfo: 'Extra info' });
    assertEquals(transformed.episodes_list, episodes);
    assertEquals(transformed.moreinfo, 'Extra info');
  });
});

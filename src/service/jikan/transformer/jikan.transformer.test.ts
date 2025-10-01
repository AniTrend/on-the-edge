import { assertEquals } from '@std/assert';
import { animeTransform } from './jikan.transformer.ts';
import { AnimeEpisode, AnimeResource } from '../remote/types.ts';

Deno.test('animeTransform should preserve episodes_list and moreinfo', () => {
  const episodes: AnimeEpisode[] = [
    {
      mal_id: 1,
      url: 'https://example.test/ep/1',
      title: 'Ep 1',
      title_japanese: '第1話',
      title_romanji: 'Dai 1 Wa',
      duration: 24,
      aired: '2024-01-01T00:00:00+00:00',
      filler: false,
      recap: false,
      score: null,
      synopsis: 'Pilot',
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
    title_synonyms: null,
    type: 'TV',
    score: 0,
    scored_by: 0,
    rank: null,
    popularity: null,
    members: null,
    favorites: null,
    synopsis: null,
    background: null,
    trailer: null,
    source: null,
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
    episodes_list: episodes,
  };

  const transformed = animeTransform({ ...resource, moreinfo: 'Extra info' });
  assertEquals(transformed.episodes_list, episodes);
  assertEquals(transformed.moreinfo, 'Extra info');
});

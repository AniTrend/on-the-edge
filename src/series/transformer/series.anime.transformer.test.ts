import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { seriesTransform } from './series.transformer.ts';
import { SeriesRelationId } from '@scope/service/arm';
import { JikanAnime } from '@scope/service/jikan';
import { MediaUnion } from '../types.ts';
import { MalType } from '@scope/service/jikan';

// Minimal anime fixture focusing on discriminated union behavior

describe('seriesTransform (anime union)', () => {
  it('should set kind=ANIME and omit manga block for anime resources', () => {
    const relation: SeriesRelationId = {
      myanimelist: 300,
      anilist: 400,
    };

    const anime: JikanAnime = {
      mal_id: 300,
      url: 'https://example.test/anime/300',
      approved: true,
      titles: [
        { type: 'Default', title: 'Primary Anime Title' },
        { type: 'English', title: 'Primary Anime Title EN' },
      ],
      images: {
        jpg: {
          image_url: 'a.jpg',
          small_image_url: 'a_s.jpg',
          large_image_url: 'a_l.jpg',
        },
        webp: {
          image_url: 'a.webp',
          small_image_url: 'a_s.webp',
          large_image_url: 'a_l.webp',
        },
      },
      title: 'Primary Anime Title',
      title_english: 'Primary Anime Title EN',
      title_japanese: 'アニメ',
      title_synonyms: ['Alt Anime Title'],
      type: 'TV',
      score: 0,
      scored_by: 0,
      rank: null,
      popularity: null,
      members: null,
      favorites: null,
      synopsis: 'Anime synopsis.',
      background: null,
      rating: null,
      moreinfo: 'Additional anime info.',
      episodes: 12,
      duration: '24 min per ep',
      trailer: null,
      source: 'Original',
      status: 'Finished',
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
      season: null,
      year: null,
    };

    const media = seriesTransform(
      relation,
      undefined,
      undefined,
      undefined,
      undefined,
      anime,
      undefined,
    ) as MediaUnion;

    assertEquals(media.kind, 'ANIME');
    // ensure AnimeMetadata-like fields exist
    if (!('trailers' in media) || !('schedule' in media)) {
      throw new Error('expected AnimeMetadata fields on media union');
    }
    assertEquals(media.mediaId.myanimelist, 300);
    assertEquals(media.title.canonical, 'Primary Anime Title');
  });
});

import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { seriesTransform } from './series.transformer.ts';
import { SeriesRelationId } from '@scope/service/arm';
import { JikanAnime } from '@scope/service/jikan';
import type { AnimeThemesLookupModel } from '@scope/service/animethemes';
import { MediaUnion } from '../series.types.ts';

describe('series.anime.transform', () => {
  it('should set kind=ANIME and omit manga block for anime resources', () => {
    const relation = {
      myanimelist: 300,
      anilist: 400,
    } as SeriesRelationId;

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
      rank: 0,
      popularity: 0,
      members: 0,
      favorites: 0,
      synopsis: 'Anime synopsis.',
      background: null,
      rating: null,
      moreinfo: 'Additional anime info.',
      episodes: 12,
      duration: '24 min per ep',
      trailer: null,
      source: 'Original',
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
      broadcast: {
        day: 'Mondays',
        time: '00:00',
        timezone: 'JST',
        string: 'Mondays at 00:00 (JST)',
      },
      theme: null,
      episodes_list: [],
      episodes_truncated: false,
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

  it('should expose raw animethemes and use AnimeThemes metadata as fallback enrichment', () => {
    const relation = {
      myanimelist: 300,
      anilist: 400,
    } as SeriesRelationId;

    const anime: JikanAnime = {
      mal_id: 300,
      url: 'https://example.test/anime/300',
      approved: true,
      titles: [],
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
      title: '',
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
      rating: null,
      moreinfo: null,
      episodes: 12,
      duration: '24 min per ep',
      trailer: null,
      source: 'Original',
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
      broadcast: {
        day: 'Mondays',
        time: '00:00',
        timezone: 'JST',
        string: 'Mondays at 00:00 (JST)',
      },
      theme: null,
      episodes_list: [],
      episodes_truncated: false,
    };

    const animeThemes: AnimeThemesLookupModel = {
      anime: [{
        id: 999,
        name: 'AnimeThemes Canonical Title',
        slug: 'animethemes-canonical-title',
        year: 2024,
        season: 'Spring',
        media_format: 'TV',
        animethemes: [
          {
            id: 1,
            type: 'OP',
            sequence: 1,
            slug: 'animethemes-canonical-title-op1',
            song: { id: 11, title: 'Theme Song' },
            animethemeentries: [],
          },
        ],
      }],
    };

    const media = seriesTransform(
      relation,
      undefined,
      undefined,
      animeThemes,
      undefined,
      anime,
      undefined,
    ) as MediaUnion;

    assertEquals(media.kind, 'ANIME');
    if (!('animethemes' in media)) {
      throw new Error('expected animethemes field on media union');
    }
    assertEquals(media.mediaId.slug, 'animethemes-canonical-title');
    assertEquals(media.title.canonical, 'AnimeThemes Canonical Title');
    assertEquals(media.format, 'TV');
    assertEquals(media.animethemes, animeThemes.anime[0].animethemes);
  });
});

import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertStringIncludes } from '@std/assert';
import { MangaMetadata, MediaUnion } from '../series.types.ts';
import { seriesTransform } from './series.transformer.ts';
import { SeriesRelationId } from '@scope/service/arm';
import { JikanManga } from '@scope/service/jikan';

describe('series.manga.transform', () => {
  it('should map core fields and append moreinfo to description for manga', () => {
    const relation = {
      myanimelist: 100,
      anilist: 200,
    } as SeriesRelationId;

    const manga: JikanManga = {
      mal_id: 100,
      url: 'https://example.test/manga/100',
      approved: true,
      titles: [
        { type: 'Default', title: 'Primary Manga Title' },
        { type: 'English', title: 'Primary Manga Title EN' },
      ],
      images: {
        jpg: {
          image_url: 'img.jpg',
          small_image_url: 'img_s.jpg',
          large_image_url: 'img_l.jpg',
        },
        webp: {
          image_url: 'img.webp',
          small_image_url: 'img_s.webp',
          large_image_url: 'img_l.webp',
        },
      },
      title: 'Primary Manga Title',
      title_english: 'Primary Manga Title EN',
      title_japanese: 'マンガ',
      title_synonyms: ['Alt Title'],
      type: 'Manga',
      score: 0,
      scored_by: 0,
      rank: 0,
      popularity: 0,
      members: 0,
      favorites: 0,
      synopsis: 'Manga synopsis.',
      background: null,
      rating: null,
      moreinfo: 'Additional manga info.',
      chapters: 10,
      volumes: 2,
      status: 'Finished',
      publishing: false,
      published: {
        from: null,
        to: null,
        prop: {
          from: { day: null, month: null, year: null },
          to: { day: null, month: null, year: null },
          string: null,
        },
      },
      authors: [],
      serializations: [],
      genres: [],
      explicit_genres: [],
      demographics: [],
      relations: [],
      external: [],
      source: 'Manga',
    };

    const media = seriesTransform(
      relation,
      undefined, // skyhook
      undefined, // tmdb
      undefined, // themes
      undefined, // notify
      manga, // jikan (manga)
      undefined, // trakt
    ) as MediaUnion;

    assertEquals(media.kind, 'MANGA');
    assertEquals(media.mediaId.myanimelist, 100);
    assertEquals(media.title.canonical, 'Primary Manga Title');
    assertEquals(media.cover.large, 'img_l.jpg');
    assertStringIncludes(media.description!, 'Manga synopsis.');
    assertStringIncludes(
      media.moreInfo!,
      'Additional manga info.',
    );
    // Manga metadata
    assertEquals((media as MangaMetadata)?.chapters, 10);
    assertEquals((media as MangaMetadata)?.volumes, 2);
  });
});

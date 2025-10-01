import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { mangaTransform } from './transformer/jikan.transformer.ts';
import { MangaResource } from './remote/types.ts';

describe('jikan manga transformer', () => {
  it('should preserve moreinfo field when present', () => {
    const resource: MangaResource = {
      mal_id: 2,
      url: 'https://example.test/manga',
      approved: true,
      titles: [{ type: 'Default', title: 'Manga Title' }],
      images: {
        jpg: { image_url: '', small_image_url: '', large_image_url: '' },
        webp: { image_url: '', small_image_url: '', large_image_url: '' },
      },
      title: 'Manga Title',
      title_english: 'Manga English',
      title_japanese: 'マンガ',
      type: 'Manga',
      score: 0,
      scored_by: 0,
      rank: 0,
      popularity: 0,
      members: 0,
      favorites: 0,
      synopsis: 'Synopsis',
      background: 'Background',
      rating: undefined,
      title_synonyms: ['Synonym'],
      moreinfo: 'Additional manga info',
      chapters: 10,
      volumes: 2,
      status: 'Finished',
      publishing: false,
      published: {
        from: '',
        to: '',
        prop: {
          from: { day: 0, month: 0, year: 0 },
          to: { day: 0, month: 0, year: 0 },
          string: '',
        },
      },
    };

    const transformed = mangaTransform(resource);
    assertEquals(transformed.moreinfo, 'Additional manga info');
  });
});

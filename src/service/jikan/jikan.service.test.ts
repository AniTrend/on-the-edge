import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { animeTransform } from './transformer/jikan.transformer.ts';
import { AnimeResource } from './remote/types.ts';

// Simple unit test to ensure moreinfo is preserved through transform

describe('jikan anime transformer', () => {
  it('should preserve moreinfo field when present', () => {
    const resource: AnimeResource = {
      mal_id: 1,
      url: 'https://example.test',
      approved: true,
      titles: [{ type: 'Default', title: 'Title' }],
      images: {
        jpg: { image_url: '', small_image_url: '', large_image_url: '' },
        webp: { image_url: '', small_image_url: '', large_image_url: '' },
      },
      title: 'Title',
      title_english: 'English Title',
      title_japanese: '日本語',
      type: 'TV',
      score: 0,
      scored_by: 0,
      rank: 0,
      popularity: 0,
      members: 0,
      favorites: 0,
      synopsis: 'Synopsis',
      background: 'Background',
      rating: 'pg',
      title_synonyms: ['Synonym'],
      moreinfo: 'Additional info',
      trailer: { youtube_id: '', url: '', embed_url: '' },
      source: 'Original',
      episodes: 12,
      status: 'Finished Airing',
      airing: false,
      aired: {
        from: '',
        to: '',
        prop: {
          from: { day: 0, month: 0, year: 0 },
          to: { day: 0, month: 0, year: 0 },
          string: '',
        },
      },
      duration: '24m',
      season: 'spring',
      year: 2024,
    };

    const transformed = animeTransform(resource);
    assertEquals(transformed.moreinfo, 'Additional info');
  });
});

// NOTE: seriesTransform integration requires env and broader setup; omitted here to keep test pure.

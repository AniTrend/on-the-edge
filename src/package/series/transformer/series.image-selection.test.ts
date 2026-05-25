import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import type { SeriesImageAttributes } from '../series.types.ts';
import { selectSeriesImages } from './series.image-selection.ts';

const image = (
  type: SeriesImageAttributes['type'],
  locale: string | null,
  url: string,
  width = 1000,
  height = 1500,
): SeriesImageAttributes => ({
  type,
  locale,
  url,
  width,
  height,
});

describe('series.image-selection', () => {
  it('should derive the device language from locale values', () => {
    const images = [
      image('POSTER', 'jp', 'poster-jp'),
      image('POSTER', 'en', 'poster-en'),
      image('POSTER', 'en-US', 'poster-en-us'),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-US').map((entry) => entry.url),
      ['poster-jp', 'poster-en'],
    );
  });

  it('should normalize provider and device locale casing before matching buckets', () => {
    const images = [
      image('POSTER', 'JP', 'poster-jp'),
      image('POSTER', 'EN-us', 'poster-en-us'),
      image('POSTER', 'fr', 'poster-fr'),
    ];

    assertEquals(
      selectSeriesImages(images, 'En-GB').map((entry) => entry.url),
      ['poster-jp', 'poster-en-us'],
    );
  });

  it('should select jp first and then the device locale for the same type', () => {
    const images = [
      image('POSTER', 'en', 'poster-en'),
      image('POSTER', 'jp', 'poster-jp'),
      image('BACKDROP', 'jp', 'backdrop-jp'),
      image('BACKDROP', 'en', 'backdrop-en'),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-GB').map((entry) => entry.url),
      ['poster-jp', 'poster-en', 'backdrop-jp', 'backdrop-en'],
    );
  });

  it('should use universal images as fallback when preferred locale is missing', () => {
    const images = [
      image('POSTER', 'jp', 'poster-jp'),
      image('POSTER', null, 'poster-universal'),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-US').map((entry) => entry.url),
      ['poster-jp', 'poster-universal'],
    );
  });

  it('should choose the best available image when no preferred or universal image exists', () => {
    const images = [
      image('LOGO', 'fr', 'logo-fr-small', 400, 100),
      image('LOGO', 'es', 'logo-es-large', 1200, 300),
      image('LOGO', 'de', 'logo-de-medium', 800, 200),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-US').map((entry) => entry.url),
      ['logo-es-large', 'logo-de-medium'],
    );
  });

  it('should prevent duplicate images when preferred buckets collapse or fallback repeats', () => {
    const images = [
      image('POSTER', 'jp', 'poster-jp'),
      image('BACKDROP', null, 'backdrop-universal'),
    ];

    assertEquals(
      selectSeriesImages(images, 'jp-JP').map((entry) => entry.url),
      ['poster-jp', 'backdrop-universal'],
    );
  });

  it('should not return the same image twice across different types', () => {
    const images = [
      image('POSTER', 'jp', 'shared-image'),
      image('BACKDROP', 'jp', 'shared-image'),
      image('BACKDROP', 'en', 'backdrop-en'),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-US').map((entry) => entry.url),
      ['shared-image', 'backdrop-en'],
    );
  });

  it('should use source order as the final tie-break', () => {
    const images = [
      image('POSTER', 'jp', 'poster-jp-first', 1000, 1500),
      image('POSTER', 'jp', 'poster-jp-second', 1000, 1500),
      image('POSTER', 'en', 'poster-en'),
    ];

    assertEquals(
      selectSeriesImages(images, 'en-US').map((entry) => entry.url),
      ['poster-jp-first', 'poster-en'],
    );
  });
});

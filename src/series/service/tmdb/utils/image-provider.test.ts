import { assertEquals } from 'std/testing/asserts';
import { describe, it } from 'std/testing/bdd';
import { ImageProvider, ImageProviderType } from './image-provider.ts';
import { Image } from '../remote/types.d.ts';

describe('ImageProvider', () => {
  const provider = new ImageProvider(
    {
      change_keys: [],
      images: {
        base_url: 'http://image.tmdb.org/t/p/',
        secure_base_url: 'https://image.tmdb.org/t/p/',
        backdrop_sizes: [
          'w300',
          'w780',
          'w1280',
          'original',
        ],
        logo_sizes: [
          'w45',
          'w92',
          'w154',
          'w185',
          'w300',
          'w500',
          'original',
        ],
        poster_sizes: [
          'w45',
          'w92',
          'w154',
          'w185',
          'w300',
          'w500',
          'original',
        ],
        profile_sizes: [
          'w45',
          'w185',
          'h632',
          'original',
        ],
        still_sizes: [
          'w92',
          'w185',
          'w300',
          'original',
        ],
      },
    },
  );

  describe('getPosterUrl', () => {
    it('should return the correct URL for a given path and image width', () => {
      const image: Image = {
        aspect_ratio: 0,
        height: 800,
        iso_639_1: null,
        file_path: '/6bcc6R6GyC6KSi3hLlV7jzwiW57.jpg',
        vote_average: 0,
        vote_count: 0,
        width: 500,
      };
      assertEquals(
        provider.getUrl(image, ImageProviderType.POSTER),
        'https://image.tmdb.org/t/p/original/6bcc6R6GyC6KSi3hLlV7jzwiW57.jpg',
      );
    });
  });

  describe('getBackdropUrl', () => {
    it('should return the correct URL for a given path and image width', () => {
      const image: Image = {
        aspect_ratio: 0,
        height: 300,
        iso_639_1: null,
        file_path: '/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg',
        vote_average: 0,
        vote_count: 0,
        width: 780,
      };
      assertEquals(
        provider.getUrl(image, ImageProviderType.BACKDROP),
        'https://image.tmdb.org/t/p/w780/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg',
      );
    });
  });

  describe('getLogoUrl', () => {
    it('should return the correct URL for a given path and image width', () => {
      const image: Image = {
        aspect_ratio: 0,
        height: 80,
        iso_639_1: null,
        file_path: '/hUzeosd33nzE5MCNsZxCGEKTXaQ.png',
        vote_average: 0,
        vote_count: 0,
        width: 185,
      };
      assertEquals(
        provider.getUrl(image, ImageProviderType.LOGO),
        'https://image.tmdb.org/t/p/w185/hUzeosd33nzE5MCNsZxCGEKTXaQ.png',
      );
    });
  });
});

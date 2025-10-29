import { Tmdb, TmdbSeason, TmdbShow } from './tmdb.types.ts';
import {
  ImageProvider,
  ImageProviderType,
} from './utils/tmdb.image-provider.ts';
import { TmdbImages, TmdbMovie } from '@scope/service/tmdb';

export const FALLBACK_PROVIDER = new ImageProvider({
  change_keys: [],
  images: {
    base_url: 'http://image.tmdb.org/t/p/',
    secure_base_url: 'https://image.tmdb.org/t/p/',
    backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
    logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
    poster_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
    profile_sizes: ['w45', 'w185', 'h632', 'original'],
    still_sizes: ['w92', 'w185', 'w300', 'original'],
  },
});

const imagesTransformer = (
  images: TmdbImages,
  provider: ImageProvider = FALLBACK_PROVIDER,
): TmdbImages => ({
  ...images,
  backdrops: images.backdrops?.map((image) => ({
    ...image,
    file_path: provider.getUrl(image, ImageProviderType.BACKDROP),
  })) ?? [],
  logos: images.logos?.map((logo) => ({
    ...logo,
    file_path: provider.getUrl(logo, ImageProviderType.LOGO),
  })) ?? [],
  posters: images.posters?.map((image) => ({
    ...image,
    file_path: provider.getUrl(image, ImageProviderType.POSTER),
  })) ?? [],
});

const baseTransformer = (
  data: Tmdb,
  provider: ImageProvider = FALLBACK_PROVIDER,
): Tmdb => ({
  ...data,
  backdrop_path: provider.getImageUrl('original', data.backdrop_path ?? null),
  images: imagesTransformer(data.images, provider),
  networks: data.networks?.map((network) => ({
    ...network,
    logo_path: provider.getImageUrl('original', network.logo_path ?? null),
  })) ?? [],
  production_companies: data.production_companies?.map((company) => ({
    ...company,
    logo_path: provider.getImageUrl('original', company.logo_path ?? null),
  })) ?? [],
});

export const seasonTransformer = (
  data: TmdbSeason,
  provider: ImageProvider = FALLBACK_PROVIDER,
): TmdbSeason => ({
  ...data,
  poster_path: provider.getImageUrl('original', data.poster_path ?? null),
  episodes: data.episodes?.map((episode) => ({
    ...episode,
    still_path: provider.getImageUrl('original', episode.still_path ?? null),
    crew: episode.crew?.map((crew) => ({
      ...crew,
      profile_path: provider.getImageUrl('original', crew.profile_path ?? null),
    })) ?? [],
    guest_stars: episode.guest_stars?.map((guest) => ({
      ...guest,
      profile_path: provider.getImageUrl(
        'original',
        guest.profile_path ?? null,
      ),
    })) ?? [],
  })) ?? [],
  images: data.images ? imagesTransformer(data.images, provider) : null,
});

export const showTransformer = (
  data: TmdbShow,
  provider: ImageProvider = FALLBACK_PROVIDER,
): Tmdb => ({
  ...baseTransformer(data, provider),
  last_episode_to_air: data.last_episode_to_air
    ? {
      ...data.last_episode_to_air,
      still_path: provider.getImageUrl(
        'original',
        data.last_episode_to_air.still_path ?? null,
      ),
    }
    : data.last_episode_to_air,
  seasons: data.seasons?.map((season) => ({
    ...seasonTransformer(season, provider),
  })) ?? [],
});

export const movieTransformer = (
  data: TmdbMovie,
  provider: ImageProvider = FALLBACK_PROVIDER,
): Tmdb => ({
  ...baseTransformer(data, provider),
  belongs_to_collection: data.belongs_to_collection
    ? {
      ...data.belongs_to_collection,
      backdrop_path: provider.getImageUrl(
        'original',
        data.belongs_to_collection.backdrop_path ?? null,
      ),
      poster_path: provider.getImageUrl(
        'original',
        data.belongs_to_collection.poster_path ?? null,
      ),
    }
    : null,
});

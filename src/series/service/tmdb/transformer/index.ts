import { Transform } from '../../../../common/transformer/types.d.ts';
import { Show } from '../remote/types.d.ts';
import { TmdbShow } from '../types.d.ts';
import { ImageProvider, ImageProviderType } from '../utils/image-provider.ts';

export const provider = new ImageProvider(
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

export const transform: Transform<Show, TmdbShow> = (sourceData) =>
  ({
    ...sourceData,
    backdrop_path: provider.getImageUrl('original', sourceData.backdrop_path),
    images: {
      backdrops: sourceData.images.backdrops.map((image) => ({
        ...image,
        file_path: provider.getUrl(image, ImageProviderType.BACKDROP),
      })),
      logos: sourceData.images.logos.map((logo) => ({
        ...logo,
        file_path: provider.getUrl(logo, ImageProviderType.LOGO),
      })),
      posters: sourceData.images.posters.map((image) => ({
        ...image,
        file_path: provider.getUrl(image, ImageProviderType.POSTER),
      })),
    },
    networks: sourceData.networks.map((network) => ({
      ...network,
      logo_path: provider.getImageUrl('original', network.logo_path),
    })),
    production_companies: sourceData.production_companies.map((company) => ({
      ...company,
      logo_path: provider.getImageUrl('original', company.logo_path),
    })),
    first_air_date: sourceData?.first_air_date,
    lastAirDate: sourceData?.last_air_date,
    last_episode_to_air: {
      ...sourceData.last_episode_to_air,
      still_path: provider.getImageUrl(
        'original',
        sourceData.last_episode_to_air.still_path,
      ),
    },
  }) as TmdbShow;

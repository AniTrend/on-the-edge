import { toInstant } from '../../../../_shared/helpers/date.ts';
import { Transform } from '../../../../_shared/transformer/types.d.ts';
import {
  AnimeModel,
  ImageModel,
  MappingModel,
  TrailerModel,
} from '../remote/types.d.ts';
import { Anime, MediaId, Poster, Trailer } from './types.d.ts';
import { Format, Source, Status } from './enums.ts';

const mapMediaId = (input: MappingModel[]): MediaId => {
  const mappings: MediaId = {};
  input.forEach((mapping) => {
    const [serviceKey] = mapping.service.split('/');
    if (serviceKey) {
      mappings[serviceKey] = mapping.serviceId;
    }
  });
  return mappings;
};

const mapTrailer = (trailers: TrailerModel[]): Trailer[] => {
  const baseUrl = 'https://www.youtube.com/watch?v=';
  return trailers.map((trailer) => {
    const platform = trailer.service.toLowerCase();
    if (platform === 'youtube') {
      return {
        id: baseUrl + trailer.serviceId,
        site: platform,
        thumbnail:
          `https://img.youtube.com/vi/${trailer.serviceId}/maxresdefault.jpg`,
      };
    } else {
      return {
        id: trailer.serviceId,
        site: platform,
      };
    }
  });
};

const mapHSLToHex = (
  h: number,
  s: number,
  l: number,
): string => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const mapPoster = (image: ImageModel): Poster => ({
  color: mapHSLToHex(
    image.averageColor.hue,
    image.averageColor.saturation,
    image.averageColor.lightness,
  ),
  large: `${image.extension}`,
});

const mapStatus = (status: string): Status => {
  switch (status) {
    case 'current':
      return Status.RELEASING;
    case 'finished':
      return Status.FINISHED;
    default:
      return Status.NOT_YET_RELEASED;
  }
};

const mapSource = (source: string): Source => {
  switch (source) {
    case 'manga':
      return Source.MANGA;
    case 'original':
      return Source.ORIGINAL;
    default:
      return Source.OTHER;
  }
};

const mapFormat = (type: string): Format => {
  switch (type) {
    case 'manga':
      return Format.MOVIE;
    case 'ona':
      return Format.ONA;
    case 'ova':
      return Format.OVA;
    case 'special':
      return Format.SPECIAL;
    default:
      return Format.TV;
  }
};

export const transform: Transform<AnimeModel, Anime> = (sourceData) => ({
  id: sourceData.id,
  title: {
    english: sourceData.title.english,
    native: sourceData.title.hiragana,
    romaji: sourceData.title.romaji,
    canonical: sourceData.title.canonical,
    harigana: sourceData.title.hiragana,
    synonyms: sourceData.title.synonyms,
  },
  format: mapFormat(sourceData.type),
  summary: sourceData.summary,
  status: mapStatus(sourceData.status),
  startDate: toInstant(sourceData.startDate),
  endDate: toInstant(sourceData.endDate),
  episodeCount: sourceData.episodeCount,
  episodeLength: sourceData.episodeLength,
  source: mapSource(sourceData.source),
  poster: mapPoster(sourceData.image),
  rating: sourceData.rating,
  trailers: mapTrailer(sourceData.trailers),
  mediaId: mapMediaId(sourceData.mappings),
});

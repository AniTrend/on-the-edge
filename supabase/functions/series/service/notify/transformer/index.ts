import { toFuzzyDate } from '../../../../_shared/helpers/date.ts';
import { Transform } from '../../../transformer/types.d.ts';
import {
  AnimeModel,
  ImageModel,
  MappingModel,
  TrailerModel,
} from '../remote/types.d.ts';
import {
  Anime,
  Format,
  MediaId,
  Poster,
  Source,
  Status,
  Trailer,
} from './types.ts';

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
  hue: number,
  saturation: number,
  lightness: number,
): string => {
  const h = hue * 360;
  const s = saturation * 100;
  const l = lightness * 100;

  const c = (1 - Math.abs(2 * l - 1)) * (s / 100);
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  const hueToRgbMap: number[][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];

  const [r, g, b] = hueToRgbMap[Math.floor(h / 60) % 6].map((val) =>
    Math.round((val + m) * 255)
  );

  const red = r.toString(16).padStart(2, '0');
  const green = g.toString(16).padStart(2, '0');
  const blue = b.toString(16).padStart(2, '0');

  return `#${red}${green}${blue}`;
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
  startDate: toFuzzyDate(sourceData.startDate),
  endDate: toFuzzyDate(sourceData.endDate),
  episodeCount: sourceData.episodeCount,
  episodeLength: sourceData.episodeLength,
  source: mapSource(sourceData.source),
  poster: mapPoster(sourceData.image),
  rating: sourceData.rating,
  trailers: mapTrailer(sourceData.trailers),
  mediaId: mapMediaId(sourceData.mappings),
});

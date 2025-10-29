import { toInstant } from '@scope/common/utils';
import { Transform } from '@scope/common/transformer';
import {
  EnrichedAnimeData,
  NotifyAnimeRemote,
  NotifyEpisodeRemote,
} from '../types.ts';
import {
  Anime,
  MediaId,
  Poster,
  Trailer,
  TransformedEpisode,
} from './types.ts';
import { Format, Source, Status } from './enums.ts';

const mapMediaId = (input: NotifyAnimeRemote['mappings']): MediaId => {
  const mappings: MediaId = {};
  if (!input) return mappings;
  input.forEach((mapping) => {
    const [serviceKey] = mapping.service.split('/');
    if (serviceKey) {
      mappings[serviceKey] = mapping.serviceId;
    }
  });
  return mappings;
};

const mapTrailer = (trailers: NotifyAnimeRemote['trailers']): Trailer[] => {
  if (!trailers) return [];
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

const mapPoster = (image: NotifyAnimeRemote['image']): Poster => ({
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

const resolveTitle = (episode: NotifyEpisodeRemote): string => {
  const base = episode.title.english || episode.title.romaji ||
    episode.title.japanese;
  return base?.trim().length ? base : `Episode ${episode.number}`;
};

const mapEpisode = (episode: NotifyEpisodeRemote): TransformedEpisode => ({
  id: episode.id,
  number: episode.number,
  title: resolveTitle(episode),
  startAirDate: episode.airingDate?.start
    ? toInstant(episode.airingDate.start)
    : undefined,
  endAirDate: episode.airingDate?.end
    ? toInstant(episode.airingDate.end)
    : undefined,
});

export const transform: Transform<EnrichedAnimeData, Anime> = (sourceData) => {
  const anime = sourceData as NotifyAnimeRemote & {
    episodes: NotifyEpisodeRemote[];
  };

  return {
    id: anime.id,
    title: {
      english: anime.title.english || '',
      native: anime.title.hiragana || '',
      romaji: anime.title.romaji || '',
      canonical: anime.title.canonical || '',
      harigana: anime.title.hiragana || '',
      synonyms: anime.title.synonyms ?? [],
    },
    format: mapFormat(anime.type ?? ''),
    summary: anime.summary ?? '',
    status: mapStatus(anime.status ?? ''),
    startDate: toInstant(anime.startDate ?? new Date().toISOString()),
    endDate: toInstant(
      anime.endDate ?? anime.startDate ?? new Date().toISOString(),
    ),
    episodeCount: Number(anime.episodeCount ?? 0),
    episodeLength: Number(anime.episodeLength ?? 0),
    episodes: anime.episodes.map(mapEpisode),
    source: mapSource(anime.source ?? ''),
    poster: mapPoster(anime.image),
    rating: anime.rating,
    trailers: mapTrailer(anime.trailers),
    mediaId: mapMediaId(anime.mappings),
    english: anime.title.english || '',
    native: anime.title.hiragana || '',
    romaji: anime.title.romaji || '',
    canonical: anime.title.canonical || '',
    harigana: anime.title.hiragana || '',
    synonyms: anime.title.synonyms ?? [],
  };
};

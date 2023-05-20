import { Instant } from '../../_shared/helpers/date.d.ts';
import { TmdbCrew, TmdbImages } from '../service/tmdb/types.d.ts';

export type MergedEpisode = {
  air_date: string;
  episode_number: string;
  id: number;
  name: string;
  production_code: string;
  season_number: number;
  show_id: string;
  still_path: string;
  vote_average: number;
  vote_count: number;
  crew: TmdbCrew[];
  guest_stars: TmdbCrew[];
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  airedBeforeSeasonNumber?: number;
  airedBeforeEpisodeNumber?: number;
  title?: string;
  airDate: Instant;
  runtime?: number | string;
  overview?: string;
  image?: string;
};

export type MergedSeason = {
  episodes: MergedEpisode[];
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  images: TmdbImages;
};

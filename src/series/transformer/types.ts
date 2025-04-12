import { SkyhookEpisode } from '../service/skyhook/types.ts';
import { TmdbCrew, TmdbImages } from '../service/tmdb/types.ts';

export type MergedEpisode = {
  id: number;
  name: string;
  tmdbShowId: string;
  productionCode: string;
  stillPath: string;
  voteAverage: number;
  voteCount: number;
  crew: TmdbCrew[];
  guestStars: TmdbCrew[];
} & SkyhookEpisode;

export type MergedSeason = {
  episodes: MergedEpisode[];
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  images?: TmdbImages;
};

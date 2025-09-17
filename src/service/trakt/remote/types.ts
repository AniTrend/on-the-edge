import { RCF822Date } from '@scope/common/types';

interface AirsModel {
  day: string;
  time: string;
  timezone: string;
}

interface IdsModel {
  trakt: number;
  tvdb: number;
  imdb: string;
  tmdb: number;
  tvrage?: string;
}

export interface ShowModel {
  title: string;
  year: number;
  ids: IdsModel & { slug: string };
  tagline?: string;
  overview: string;
  first_aired: RCF822Date;
  airs: AirsModel;
  runtime: number;
  certification: string;
  network: string;
  country: string;
  trailer: string;
  homepage: string;
  status:
    | string
    | 'ended'
    | 'returning series'
    | 'in production'
    | 'canceled'
    | 'upcoming';
  rating: number;
  votes: number;
  comment_count: number;
  updated_at: Date;
  language: string;
  available_translations: string[];
  genres: string[];
  aired_episodes: number;
  original_title?: string;
}

export interface EpisodeModel {
  season: number;
  number: number;
  title?: string;
  ids: IdsModel;
  overview?: string;
  first_aired?: RCF822Date;
  number_abs?: number;
  runtime?: number;
  rating?: number;
  votes?: number;
  updated_at?: RCF822Date;
  episode_type?: 'series_premiere' | 'standard' | 'season_finale';
  original_title?: string; // e.g. 紅い瞳の魔法使い達【ウィザーズ】
  after_credits: boolean;
  during_credits: boolean;
}

export interface SeasonModel {
  number: number;
  ids: IdsModel;
  rating: number;
  votes: number;
  episode_count: number;
  aired_episodes: number;
  title: string; // e.g. Season 1, Specials
  overview?: string;
  first_aired?: RCF822Date;
  updated_at?: RCF822Date;
  network?: string; // e.g. Tokyo MX
  original_title?: string; // e.g. 紅い瞳の魔法使い達【ウィザーズ】
  episodes?: EpisodeModel[];
}

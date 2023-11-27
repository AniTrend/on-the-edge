import { RCF822Date } from '../../../../common/types/core.d.ts';

interface Genre {
  id: number;
  name: string;
}

interface EpisodeToAir {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: RCF822Date;
  episode_number: number;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: null | string;
}

interface Network {
  id: number;
  logo_path: null | string;
  name: string;
  origin_country: string;
}

interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface Season {
  air_date: RCF822Date;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode | null;
  images: Images | null;
}

interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

interface Image {
  aspect_ratio: number;
  height: number;
  iso_639_1: null | string;
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

interface Images {
  backdrops: Image[];
  logos: Image[];
  posters: Image[];
}

interface Crew {
  job?: string;
  department?: string;
  credit_id: string;
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: null | string;
  character?: string;
  order?: number;
}

interface Episode {
  air_date: string;
  episode_number: string;
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: string;
  season_number: number;
  show_id: string;
  still_path: string;
  vote_average: number;
  vote_count: number;
  crew: Crew[];
  guest_stars: Crew[];
}

export interface Show {
  adult: boolean;
  backdrop_path: string;
  episode_run_time: number[];
  first_air_date: RCF822Date;
  genres: Genre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: RCF822Date;
  last_episode_to_air: EpisodeToAir;
  name: string;
  next_episode_to_air: EpisodeToAir;
  networks: Network[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: Network[];
  production_countries: ProductionCountry[];
  seasons: Season[];
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
  images: Images;
}

export interface Movie {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: unknown | null;
  budget: number;
  genres: Genre[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: Network[];
  production_countries: ProductionCountry[];
  release_date: RCF822Date;
  revenue: number;
  runtime: number | null;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface Configuration {
  images: ConfigurationImages;
  change_keys: string[];
}

export interface ConfigurationImages {
  base_url: string;
  secure_base_url: string;
  backdrop_sizes: string[];
  logo_sizes: string[];
  poster_sizes: string[];
  profile_sizes: string[];
  still_sizes: string[];
}

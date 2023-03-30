export interface TitleModel {
  english: string;
  japanese: string;
  synonyms: string[];
  canonical: string;
  romaji: string;
  hiragana: string;
}

export interface ImageModel {
  extension: string | '.jpg' | '.webp';
  width: number;
  height: number;
  averageColor: {
    hue: number;
    saturation: number;
    lightness: number;
  };
  lastModified: number;
}

export interface RatingModel {
  overall: number;
  story: number;
  visuals: number;
  soundtrack: number;
  count: {
    overall: number;
    story: number;
    visuals: number;
    soundtrack: number;
  };
}

export interface MappingModel {
  service: string; // anilist/anime
  serviceId: string; // 101348
}

export interface TrailerModel extends MappingModel {
  service: string | 'Youtube';
}

export interface LinkModel {
  title: string;
  url: string;
}

export interface AnimeModel {
  id: string;
  title: TitleModel;
  type: string | 'tv' | 'movie' | 'ona' | 'ova' | 'special';
  summary: string;
  status: string | 'current' | 'upcoming' | 'finished';
  genres: string[];
  startDate: Date;
  endDate: Date;
  episodeCount: number;
  episodeLength: number;
  source: string | 'manga';
  image: ImageModel;
  firstChannel: string;
  rating: RatingModel;
  trailers: TrailerModel[];
  episodes: string[];
  mappings: MappingModel[];
  studios: string[];
  producers: string[];
  links: LinkModel[];
}

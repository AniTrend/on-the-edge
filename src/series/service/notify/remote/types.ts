export interface TitleModel {
  canonical: string;
  romaji: string;
  english: string;
  japanese: string;
  hiragana: string;
  synonyms: string[];
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

export interface PopularityModel {
  watching: number;
  completed: number;
  planned: number;
  hold: number;
  dropped: number;
}

export interface MappingModel {
  service: string;
  serviceId: string;
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
  type: 'tv' | 'movie' | 'ova' | 'ona' | 'special';
  title: TitleModel;
  summary: string;
  status: 'finished' | 'current' | 'upcoming';
  genres: string[];
  startDate: string;
  endDate: string;
  episodeCount: number;
  episodeLength: number;
  source: string;
  image: ImageModel;
  firstChannel: string;
  rating: RatingModel;
  popularity: PopularityModel;
  trailers: TrailerModel[];
  episodes: string[];
  mappings: MappingModel[];
  posts: null | unknown;
  likes: null | unknown;
  created: string;
  createdBy: string;
  edited: string;
  editedBy: string;
  isDraft: boolean;
  studios: string[];
  producers: string[];
  licensors: string[];
  links: LinkModel[] | null;
}

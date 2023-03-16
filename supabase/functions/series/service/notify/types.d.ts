interface CoreTitle {
  english: string;
  japanese: string;
  synonyms: string[];
}

interface Title extends CoreTitle {
  canonical: string;
  romaji: string;
  hiragana: string;
}

interface Image {
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

interface Rating {
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

interface Mapping {
  service: string; // anilist/anime
  serviceId: string; // 101348
}

interface ITrailer extends Mapping {
  service: string | 'Youtube';
}

interface Link {
  title: string;
  url: string;
}

export interface IAnime {
  id: string;
  title: Title;
  type: string | 'tv' | 'movie' | 'ona' | 'ova' | 'special';
  summary: string;
  status: string | 'current' | 'upcoming' | 'finished';
  genres: string[];
  startDate: Date; // yyyy-mm-dd
  endDate: Date; // yyyy-mm-dd
  episodeCount: number;
  episodeLength: number;
  source: string | 'manga';
  image: Image;
  firstChannel: string;
  rating: Rating;
  trailers: ITrailer[];
  episodes: string[];
  mappings: Mapping[];
  studios: string[];
  producers: string[];
  links: Link[];
}

interface Trailer {
  url: string;
  type: string | 'youtube';
  thumbnail?: string;
}

interface Ids {
  [key: string]: string;
}

export interface Anime {
  id: string;
  title: Title;
  type: string | 'tv' | 'movie' | 'ona' | 'ova' | 'special';
  summary: string;
  status: string | 'current' | 'upcoming' | 'finished';
  startDate: Date; // yyyy-mm-dd
  endDate: Date; // yyyy-mm-dd
  episodeCount: number;
  episodeLength: number;
  source: string | 'manga';
  image: Image;
  rating: Rating;
  trailers: Trailer[];
  ids: Ids;
  links: Link[];
}

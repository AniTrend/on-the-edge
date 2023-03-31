interface Period {
  from: string;
  to: string;
  prop: {
    from: {
      day: number;
      month: number;
      year: number;
    };
    to: {
      day: number;
      month: number;
      year: number;
    };
    string: string;
  };
}

interface MalResource {
  mal_id: number;
  url: string;
  approved: boolean;
  titles: Array<
    {
      type: string;
      title: string;
    }
  >;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
  title: string;
  title_english: string;
  title_japanese: string;
  type: string | 'Manga' | 'TV';
  score: number;
  scored_by: number;
  rank: number;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background: string;
}

export interface AnimeResource extends MalResource {
  trailer: {
    youtube_id: string;
    url: string;
    embed_url: string;
  };
  title_synonyms: string[];
  source: string;
  episodes: number;
  status: string | 'Finished' | 'Airing';
  airing: boolean;
  aired: Period;
  duration: string;
  rating: string;
  season: string;
  year: number;
}

export interface MangaResource extends MalResource {
  chapters: number;
  volumes: number;
  status: string | 'Finished';
  publishing: boolean;
  published: Period;
}
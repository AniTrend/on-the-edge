import { Document } from 'npm/mongodb';

export interface NavigationConfig extends Document {
  criteria: string;
  destination: string;
  group: {
    authenticated: boolean;
    i18n: string;
  };
  i18n: string;
  icon: string;
  id: number;
}

export interface GenreConfig extends Document {
  name: string;
  mediaId: number;
}

export interface ImageConfig extends Document {
  banner: string;
  poster: string;
  loading: string;
  error: string;
  info: string;
  default: string;
}

export interface ConfigDocument extends Document {
  _id: string;
  navigation: NavigationConfig[];
  genres: GenreConfig[];
  image: ImageConfig;
}

import { PlatformSource } from '../../common/experiment/types.d.ts';

export interface ClientConfiguration {
  settings: Settings;
  image?: Image;
  navigation?: Navigation[];
  genres?: {
    name: string;
    mediaId: number;
  }[];
}

export interface Image {
  banner: string;
  poster: string;
  loading: string;
  error: string;
  info: string;
  default: string;
}

export interface Navigation {
  criteria: Record<string, string>;
  destination: string;
  i18n: string;
  icon: string;
  group: {
    authenticated: boolean;
    i18n: string;
  };
}

export interface Settings {
  analyticsEnabled: boolean;
  platformSource?: PlatformSource;
}

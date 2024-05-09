export interface ClientConfiguration {
  id?: string;
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
  criteria: string;
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
  platformSource?: string;
}

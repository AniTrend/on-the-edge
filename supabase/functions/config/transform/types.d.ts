import { PlatformSource } from '../../_shared/experiment/types.d.ts';

export interface ClientConfiguration {
  settings: Settings;
  image: Image;
  navigation: Navigation[];
  genres?: Map<string, number>;
}

export interface Image {
  banner: string;
  poster?: string;
}

export interface Navigation {
  id: number;
  destination: string;
  i18n: string;
  icon: string;
  group: Group;
}

export interface Group {
  id: number;
  authenticated: boolean;
  i18n: string;
}

export interface Settings {
  analyticsEnabled: boolean;
  platformSource?: PlatformSource;
}

export interface PlatformSource {
  api: string;
  media: string;
}

export interface AppFeatures {
  'platform-source'?: PlatformSource;
  'news-refactor-api': boolean;
  'enable-analytics': boolean;
}

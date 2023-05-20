export interface PlatformSource {
  url: string;
}

export interface AppFeatures {
  'api-platform-source'?: PlatformSource;
  'news-refactor-api': boolean;
  'enable-analytics': boolean;
}

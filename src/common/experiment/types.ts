export interface PlatformSource {
  api: string;
  media: string;
}

export interface AppFeatures {
  'platform-source'?: PlatformSource;
  'news-refactor-api': boolean;
  'enable-analytics': boolean;
  // Episodes domain experiments
  'episode-merge-trakt': boolean;
  'episode-merge-notify': boolean;
  'episode-number-normalize-xem': boolean;
  // Numeric threshold for fuzzy title alignment (0..1). If absent, fallback disabled
  'episode-align-title-sim'?: number;
}

export type PlatformSource = {
  api: string;
  media: string;
} | null;

export type AppFeatures = {
  'platform-source'?: PlatformSource;
  'news-refactor-api': boolean;
  'enable-analytics': boolean;
  // Numeric threshold for fuzzy title alignment (0..1). If absent, fallback disabled
  'episode-align-title-sim'?: number;
  // Enable emitting diagnostics on episodes response
  'episodes-diagnostics'?: boolean;
  // Feature flags to enable additional episode sources incrementally
  'enable-skyhook-source'?: boolean;
  'enable-tmdb-source'?: boolean;
  'enable-trakt-source'?: boolean;
  'enable-notify-source'?: boolean;
  'enable-themes-source'?: boolean;
};

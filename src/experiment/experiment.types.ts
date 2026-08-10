export type PlatformSource = {
  api: string;
  media: string;
} | null;

/**
 * Action attached to an AniTrend v2 promotion. The payload, wording, and
 * rollout targeting live in GrowthBook, not in this repository.
 */
export type PromotionAction = {
  type: 'OPEN_URL';
  url: string;
};

/**
 * Operational payload for the AniTrend v2 promotion. This is a promotion
 * and config concept, never an update release for the AniTrend App.
 */
export type PromotionFeature = {
  id: string;
  targetProduct: 'ANITREND_V2';
  title: string;
  message: string;
  action: PromotionAction;
};

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
  // AniTrend v2 promotion served through the config endpoint. Absent or
  // null disables the promotion without a client release.
  'anitrend-v2-promotion'?: PromotionFeature | null;
};

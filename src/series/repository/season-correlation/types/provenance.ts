/**
 * Tracks information about episode data provenance
 */
export interface EpisodeProvenance {
  sourceType: 'tmdb' | 'skyhook' | 'anime' | 'merged';
  originalIds: {
    tmdb?: number;
    tvdb?: number;
    malEpisodeId?: number;
    anilistEpisodeId?: number;
  };
  confidence: number; // 0-1 value indicating confidence in mapping
  mappingNotes?: string; // Any notes about the mapping
}

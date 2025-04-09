/**
 * Configuration system for manual mapping adjustments
 * Use this when automatic detection doesn't work perfectly
 */

import { MappingPattern } from './types/index.ts';

export interface AnimeSeasonConfig {
  /**
   * The anime ID in the respective system
   */
  animeIds: {
    /**
     * ID in the Notify system
     */
    notify?: number;
    /**
     * ID in MyAnimeList
     */
    mal?: number;
    /**
     * ID in AniList
     */
    anilist?: number;
  };

  /**
   * The TV show IDs in the respective systems
   */
  tvShowIds: {
    /**
     * ID in The Movie Database
     */
    tmdb?: number;
    /**
     * ID in The TV Database
     */
    tvdb?: number;
    /**
     * ID in Trakt
     */
    trakt?: number;
  };

  /**
   * Override the automatically detected mapping pattern
   */
  mappingPattern?: MappingPattern;

  /**
   * Override settings for handling Season 0 (specials)
   */
  specialsHandling?: 'standalone' | 'integrated' | 'distributed';

  /**
   * Manual episode mapping for complex cases
   * Maps anime episode numbers to western TV show season/episode numbers
   * e.g. { "1": { "season": 1, "episode": 1 }, "2": { "season": 1, "episode": 2 } }
   */
  episodeMappings?: Record<string, { season: number; episode: number }>;

  /**
   * Custom season mapping override
   * Maps anime seasons to western TV show seasons
   * e.g. { "1": 1, "2": 1, "3": 2 } (anime seasons 1 and 2 map to western season 1)
   */
  seasonMappings?: Record<string, number>;

  /**
   * Viewing order recommendations
   */
  viewingOrder?: {
    /**
     * General guidance for specials
     */
    specials?: string;
    /**
     * Custom order for specific episodes
     */
    custom?: string;
  };
}

/**
 * Collection of mapping configurations
 */
export interface AnimeSeasonMappingConfigs {
  /**
   * Mapping configs indexed by a unique identifier (typically tmdbId_animeId)
   */
  [key: string]: AnimeSeasonConfig;
}

/**
 * Default mapping configurations for well-known series
 * These can be used when automatic detection fails
 */
export const DEFAULT_MAPPING_CONFIGS: AnimeSeasonMappingConfigs = {
  // This is just a sample, you'd add real shows with known mapping issues here
  
  // Example: Fate/Zero
  "fate_zero": {
    animeIds: {
      mal: 10087,
      anilist: 10087,
    },
    tvShowIds: {
      tmdb: 39773,
      tvdb: 252376,
    },
    mappingPattern: MappingPattern.SPLIT_COURS,
    viewingOrder: {
      custom: "Watch Fate/Zero before Fate/Stay Night: Unlimited Blade Works for chronological order"
    },
  },
  
  // Example: Sword Art Online
  "sword_art_online": {
    animeIds: {
      mal: 11757,
      anilist: 11757,
    },
    tvShowIds: {
      tmdb: 45782,
      tvdb: 259640,
    },
    mappingPattern: MappingPattern.SPLIT_COURS,
    specialsHandling: "integrated",
    // Map first half to season 1, second half to season 2, etc.
    seasonMappings: {
      "1": 1,
      "2": 1, 
      "3": 2,
      "4": 2,
    },
  },
  
  // Example: Attack on Titan / Shingeki no Kyojin
  "attack_on_titan": {
    animeIds: {
      mal: 16498,
      anilist: 16498,
    },
    tvShowIds: {
      tmdb: 1429,
      tvdb: 267440,
    },
    mappingPattern: MappingPattern.SEQUENTIAL,
    specialsHandling: "standalone",
    viewingOrder: {
      specials: "OVAs can be watched after their corresponding seasons"
    }
  }
};

/**
 * Gets a mapping configuration for a specific anime/TV show combination
 */
export function getMappingConfig(
  tmdbId?: number,
  tvdbId?: number,
  animeId?: number
): AnimeSeasonConfig | undefined {
  // Create keys to look up in the configuration
  const possibleKeys = [
    tmdbId && animeId ? `tmdb${tmdbId}_anime${animeId}` : undefined,
    tvdbId && animeId ? `tvdb${tvdbId}_anime${animeId}` : undefined,
    tmdbId ? `tmdb${tmdbId}` : undefined,
    tvdbId ? `tvdb${tvdbId}` : undefined,
    animeId ? `anime${animeId}` : undefined,
  ].filter(Boolean) as string[];
  
  // Check each possible key
  for (const key of possibleKeys) {
    if (DEFAULT_MAPPING_CONFIGS[key]) {
      return DEFAULT_MAPPING_CONFIGS[key];
    }
  }
  
  // If no direct match, see if we can match by IDs inside the config
  for (const [_, config] of Object.entries(DEFAULT_MAPPING_CONFIGS)) {
    if (
      (tmdbId && config.tvShowIds.tmdb === tmdbId) ||
      (tvdbId && config.tvShowIds.tvdb === tvdbId) ||
      (animeId && (
        config.animeIds.notify === animeId ||
        config.animeIds.mal === animeId ||
        config.animeIds.anilist === animeId
      ))
    ) {
      return config;
    }
  }
  
  // No match found
  return undefined;
}

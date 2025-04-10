import { TmdbSeason } from '../../service/tmdb/types.ts';
import { SkyhookEpisode } from '../../service/skyhook/types.ts';
import { MappingPattern } from './types/index.ts';
import { AnimeSeasonConfig } from './config.ts';

/**
 * Detects patterns in the relationship between Western and anime seasons
 */
export class PatternDetector {
  /**
   * Identifies the mapping pattern for a season
   */
  public static identifyMappingPattern(
    tmdbSeason: TmdbSeason,
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
    config?: AnimeSeasonConfig,
  ): MappingPattern {
    // Check if we have a configuration override
    if (config?.mappingPattern) {
      return config.mappingPattern;
    }

    // Check for split cours (one Western season maps to multiple anime cours)
    if (animeData && this.detectSplitCours(tmdbSeason, animeData)) {
      return MappingPattern.SPLIT_COURS;
    }

    // Check for merged seasons (multiple Western seasons in one anime season)
    if (animeData && this.detectMergedSeasons(tmdbSeason, animeData)) {
      return MappingPattern.MERGED_SEASONS;
    }

    // Check for rearranged episodes
    if (this.detectRearrangedEpisodes(tmdbSeason, skyhookEpisodes)) {
      return MappingPattern.REARRANGED;
    }

    // Default to sequential mapping
    return MappingPattern.SEQUENTIAL;
  }

  /**
   * Detects if one Western season maps to multiple anime cours
   */
  private static detectSplitCours(
    tmdbSeason: TmdbSeason,
    animeData: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): boolean {
    // If the anime has more seasons than the Western show, it might be split cours
    // This is a simplistic heuristic; we would need more data for accurate detection
    const westernEpisodeCount = tmdbSeason.episode_count || 0;

    // Check if episode count is roughly double a standard cour (12-13 episodes)
    return westernEpisodeCount >= 22 && westernEpisodeCount <= 26 &&
      animeData.seasons >= 2;
  }

  /**
   * Detects if multiple Western seasons map to one anime season
   */
  private static detectMergedSeasons(
    tmdbSeason: TmdbSeason,
    animeData: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): boolean {
    // If the anime has fewer seasons than the Western show, it might be merged seasons
    // This is a simplistic heuristic; we would need more data for accurate detection
    const westernEpisodeCount = tmdbSeason.episode_count || 0;

    // Check if episode count is roughly half a standard cour (12-13 episodes)
    return westernEpisodeCount > 0 && westernEpisodeCount <= 7 &&
      animeData.seasons < 2;
  }

  /**
   * Detects if episodes are rearranged between sources
   */
  private static detectRearrangedEpisodes(
    tmdbSeason: TmdbSeason,
    skyhookEpisodes: SkyhookEpisode[],
  ): boolean {
    // Check for episodes with airedBefore or airedAfter fields set
    return skyhookEpisodes.some((episode) =>
      episode.airedBeforeEpisodeNumber !== undefined ||
      episode.airedAfterEpisodeNumber !== undefined
    );
  }
}

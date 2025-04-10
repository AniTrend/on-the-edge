import { TmdbSeason } from '../../service/tmdb/types.ts';
import { SkyhookEpisode } from '../../service/skyhook/types.ts';
import { MappingPattern, SpecialsMapping } from './types/index.ts';

/**
 * Specialized class for analyzing and categorizing special episodes
 */
export class SpecialsDetector {
  /**
   * Detects how specials should be handled based on content analysis
   */
  public static detectSpecialsType(
    specialSeason: TmdbSeason,
    specialEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): MappingPattern {
    // Check if these are recap episodes that belong within their respective seasons
    if (this.areRecapEpisodes(specialEpisodes)) {
      return MappingPattern.SPECIALS_INTEGRATED;
    }

    // Check if these are side stories that distribute across multiple seasons
    if (this.areSideStories(specialEpisodes)) {
      return MappingPattern.SPECIALS_DISTRIBUTED;
    }

    // Check if these are OVAs/ONAs that stand alone
    if (this.areStandaloneOVAs(specialEpisodes, animeData)) {
      return MappingPattern.SPECIALS_STANDALONE;
    }

    // Default to standalone if we can't determine the type
    return MappingPattern.SPECIALS_STANDALONE;
  }

  /**
   * Analyzes special episodes to generate a specials mapping
   */
  public static analyzeSpecials(
    specialSeason: TmdbSeason,
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): SpecialsMapping {
    // Determine special type
    const specialType = this.determineSpecialType(specialEpisodes);

    // Determine target seasons and chronological position
    const targetSeasons = this.determineTargetSeasons(
      specialEpisodes,
      regularSeasons,
    );
    const chronologicalPosition = this.determineChronologicalPosition(
      specialEpisodes,
      regularSeasons,
    );

    // Determine integration strategy
    const integrationStrategy = this.determineIntegrationStrategy(
      specialEpisodes,
      regularSeasons,
      specialType,
      chronologicalPosition,
    );

    // Create episode mappings for distributed specials
    const episodeMappings = integrationStrategy === 'distributed'
      ? this.createEpisodeMappings(specialEpisodes, regularSeasons)
      : undefined;

    return {
      specialType,
      integrationStrategy,
      targetSeasons,
      chronologicalPosition,
      episodeMappings,
    };
  }

  /**
   * Determines if specials are recap episodes
   */
  private static areRecapEpisodes(specialEpisodes: SkyhookEpisode[]): boolean {
    // Check for common recap keywords in episode titles
    const recapKeywords = ['recap', 'summary', 'special', 'compilation'];

    return specialEpisodes.some((episode) => {
      const title = episode.title?.toLowerCase() || '';
      return recapKeywords.some((keyword) => title.includes(keyword));
    });
  }

  /**
   * Determines if specials are side stories that should be distributed
   */
  private static areSideStories(specialEpisodes: SkyhookEpisode[]): boolean {
    // Check for side story indicators
    const sideStoryKeywords = ['side story', 'ova', 'ona', 'special', 'extra'];

    // Check if specials are spread out in time (suggesting they relate to different seasons)
    // This is a heuristic - with more data we could make better decisions
    const hasSpreadOutDates = this.hasSpreadOutAirDates(specialEpisodes);

    const hasSideStoryTitles = specialEpisodes.some((episode) => {
      const title = episode.title?.toLowerCase() || '';
      return sideStoryKeywords.some((keyword) => title.includes(keyword));
    });

    // If both indicators are present, likely distributed side stories
    return hasSpreadOutDates && hasSideStoryTitles;
  }

  /**
   * Checks if air dates are spread out over a longer period
   */
  private static hasSpreadOutAirDates(
    specialEpisodes: SkyhookEpisode[],
  ): boolean {
    // Need at least a few episodes to determine spread
    if (specialEpisodes.length < 3) return false;

    // Get dates that are valid
    const validDates = specialEpisodes
      .filter((ep) => ep.airDate)
      .map((ep) => new Date(ep.airDate!).getTime());

    if (validDates.length < 2) return false;

    // Sort dates
    validDates.sort();

    // Check time span (if over 3 months, considered spread out)
    const timeSpan = validDates[validDates.length - 1] - validDates[0];
    const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000;

    return timeSpan > threeMonthsInMs;
  }

  /**
   * Determines if specials are standalone OVAs/ONAs
   */
  private static areStandaloneOVAs(
    specialEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): boolean {
    // Check if anime data indicates these as separate OVAs
    if (animeData?.episodes.some((ep) => ep.type === 'ova')) {
      return true;
    }

    // Check for OVA/ONA keywords in titles
    const ovaKeywords = ['ova', 'ona', 'special', 'movie'];

    return specialEpisodes.some((episode) => {
      const title = episode.title?.toLowerCase() || '';
      return ovaKeywords.some((keyword) => title.includes(keyword));
    });
  }

  /**
   * Determines the special type based on episode analysis
   */
  private static determineSpecialType(
    specialEpisodes: SkyhookEpisode[],
  ): SpecialsMapping['specialType'] {
    // Simple keyword-based heuristic for special type
    for (const episode of specialEpisodes) {
      const title = episode.title?.toLowerCase() || '';

      if (title.includes('recap') || title.includes('summary')) {
        return 'recap';
      }

      if (title.includes('ova')) {
        return 'ova';
      }

      if (title.includes('ona')) {
        return 'ona';
      }

      if (title.includes('crossover')) {
        return 'crossover';
      }
    }

    // Default to unknown if can't determine
    return 'unknown';
  }

  /**
   * Determines which regular seasons the specials relate to
   */
  private static determineTargetSeasons(
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
  ): number[] {
    // Check for aired before/after season references
    const referencedSeasons = new Set<number>();

    specialEpisodes.forEach((episode) => {
      if (episode.airedBeforeSeasonNumber !== undefined) {
        referencedSeasons.add(episode.airedBeforeSeasonNumber);
      }

      if (episode.airedAfterSeasonNumber !== undefined) {
        referencedSeasons.add(episode.airedAfterSeasonNumber);
      }
    });

    // If we have references, use those
    if (referencedSeasons.size > 0) {
      return Array.from(referencedSeasons);
    }

    // Otherwise, try to determine based on air dates
    const specialDates = specialEpisodes
      .filter((ep) => ep.airDate)
      .map((ep) => new Date(ep.airDate!).getTime());

    // If no air dates, return all season numbers
    if (specialDates.length === 0) {
      return regularSeasons.map((season) => season.season_number);
    }

    // Find seasons with air dates near the specials
    const relatedSeasons = regularSeasons
      .filter((season) => {
        // Skip if no air date
        if (!season.air_date) return false;

        const seasonDate = new Date(season.air_date).getTime();
        // Consider related if within 3 months of a special
        return specialDates.some((specialDate) =>
          Math.abs(seasonDate - specialDate) < 3 * 30 * 24 * 60 * 60 * 1000
        );
      })
      .map((season) => season.season_number);

    // If we found related seasons, use those
    if (relatedSeasons.length > 0) {
      return relatedSeasons;
    }

    // Default to all seasons if we can't determine
    return regularSeasons.map((season) => season.season_number);
  }

  /**
   * Determines when specials should be watched relative to regular seasons
   */
  private static determineChronologicalPosition(
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
  ): SpecialsMapping['chronologicalPosition'] {
    // Check for aired before/after references
    const hasBeforeSeason = specialEpisodes.some((ep) =>
      ep.airedBeforeSeasonNumber !== undefined
    );
    const hasAfterSeason = specialEpisodes.some((ep) =>
      ep.airedAfterSeasonNumber !== undefined
    );

    if (hasBeforeSeason && !hasAfterSeason) {
      return 'before';
    }

    if (hasAfterSeason && !hasBeforeSeason) {
      return 'after';
    }

    if (hasBeforeSeason && hasAfterSeason) {
      return 'during';
    }

    // If no explicit references, try to determine from air dates
    const specialDates = specialEpisodes
      .filter((ep) => ep.airDate)
      .map((ep) => new Date(ep.airDate!));

    // If no dates, default to after
    if (specialDates.length === 0) {
      return 'after';
    }

    // Get earliest and latest special dates
    const minSpecialDate = new Date(
      Math.min(...specialDates.map((d) => d.getTime())),
    );
    const maxSpecialDate = new Date(
      Math.max(...specialDates.map((d) => d.getTime())),
    );

    // Get season air dates
    const seasonDates = regularSeasons
      .filter((season) => season.air_date)
      .map((season) => new Date(season.air_date!));

    // If no season dates, default to after
    if (seasonDates.length === 0) {
      return 'after';
    }

    // Get earliest and latest season dates
    const minSeasonDate = new Date(
      Math.min(...seasonDates.map((d) => d.getTime())),
    );
    const maxSeasonDate = new Date(
      Math.max(...seasonDates.map((d) => d.getTime())),
    );

    // Check if specials are before all seasons
    if (maxSpecialDate < minSeasonDate) {
      return 'before';
    }

    // Check if specials are after all seasons
    if (minSpecialDate > maxSeasonDate) {
      return 'after';
    }

    // Otherwise, specials are interleaved with seasons
    return 'during';
  }

  /**
   * Determines the integration strategy for specials
   */
  private static determineIntegrationStrategy(
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
    specialType: SpecialsMapping['specialType'],
    chronologicalPosition: SpecialsMapping['chronologicalPosition'],
  ): SpecialsMapping['integrationStrategy'] {
    // Recaps are typically integrated with their season
    if (specialType === 'recap') {
      return 'season-integrated';
    }

    // OVAs often stand alone
    if (specialType === 'ova' || specialType === 'ona') {
      if (this.hasSpreadOutAirDates(specialEpisodes)) {
        return 'distributed';
      }
      return 'standalone';
    }

    // Specials that occur during the series might be distributed
    if (chronologicalPosition === 'during' && specialEpisodes.length > 1) {
      return 'distributed';
    }

    // Default to standalone for safety
    return 'standalone';
  }

  /**
   * Creates episode mappings for distributed specials
   */
  private static createEpisodeMappings(
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
  ): Record<number, { seasonNum: number; episodeNum: number }> {
    const mappings: Record<number, { seasonNum: number; episodeNum: number }> =
      {};

    // First try to use explicit references
    specialEpisodes.forEach((episode, index) => {
      if (
        episode.airedBeforeSeasonNumber !== undefined &&
        episode.airedBeforeEpisodeNumber !== undefined
      ) {
        mappings[episode.episodeNumber] = {
          seasonNum: episode.airedBeforeSeasonNumber,
          episodeNum: episode.airedBeforeEpisodeNumber - 0.5, // Place just before the referenced episode
        };
        return;
      }

      if (
        episode.airedAfterSeasonNumber !== undefined &&
        episode.airedAfterEpisodeNumber !== undefined
      ) {
        mappings[episode.episodeNumber] = {
          seasonNum: episode.airedAfterSeasonNumber,
          episodeNum: episode.airedAfterEpisodeNumber + 0.5, // Place just after the referenced episode
        };
        return;
      }

      // If no explicit reference, try to place based on air date
      if (episode.airDate) {
        const specialDate = new Date(episode.airDate).getTime();

        // Find the closest season by air date
        const closestSeason = this.findClosestSeason(
          specialDate,
          regularSeasons,
        );
        if (closestSeason) {
          mappings[episode.episodeNumber] = {
            seasonNum: closestSeason.season_number,
            episodeNum: 0.5, // Place at the beginning of the season
          };
        }
      }

      // If we still don't have a mapping, use a default approach
      if (!mappings[episode.episodeNumber]) {
        // Distribute evenly across seasons
        const targetSeasonNum =
          regularSeasons[index % regularSeasons.length]?.season_number || 1;
        mappings[episode.episodeNumber] = {
          seasonNum: targetSeasonNum,
          episodeNum: 0.5,
        };
      }
    });

    return mappings;
  }

  /**
   * Finds the closest season to a given date
   */
  private static findClosestSeason(
    targetDate: number,
    seasons: TmdbSeason[],
  ): TmdbSeason | undefined {
    let closestSeason: TmdbSeason | undefined = undefined;
    let smallestDifference = Number.MAX_SAFE_INTEGER;

    for (const season of seasons) {
      if (!season.air_date) continue;

      const seasonDate = new Date(season.air_date).getTime();
      const difference = Math.abs(seasonDate - targetDate);

      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestSeason = season;
      }
    }

    return closestSeason;
  }
}

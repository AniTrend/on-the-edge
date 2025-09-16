import { SeriesRelationId } from '../../service/arm/types.ts';
import { NotifyAnime } from '../../service/notify/types.ts';
import { SkyhookEpisode, SkyhookShow } from '../../service/skyhook/types.ts';
import { TmdbEpisode, TmdbSeason, TmdbShow } from '../../service/tmdb/types.ts';
import { zip } from '@std/collections';

import {
  EnhancedMergedEpisode,
  EnhancedMergedSeason,
  MappingPattern,
  SpecialsMapping,
} from './types/index.ts';
import { PatternDetector } from './pattern-detector.ts';
import { SpecialsDetector } from './specials-detector.ts';
import { AnimeSeasonConfig, getMappingConfig } from './config.ts';

/**
 * Maps Western season structures to anime releases
 * Similar to theXEM's approach to cross-episode mapping
 */
export class SeasonCorrelationMapper {
  constructor(
    private readonly notify: NotifyAnime | undefined,
    private readonly skyhook: SkyhookShow | undefined,
    private readonly tmdb: TmdbShow | undefined,
    private readonly relations: SeriesRelationId[],
  ) {}

  /**
   * Maps seasons across different sources with anime correlation
   */
  public correlateSeasons(): EnhancedMergedSeason[] {
    // Skip processing if not enough data
    if (!this.canCorrelate()) return [];

    // 1. Get configuration if available
    const config = this.getConfiguration();

    // 2. Extract season structures from each source
    const tmdbSeasons = this.extractTmdbSeasons();
    const skyhookEpisodes = this.extractSkyhookEpisodes();
    const animeData = this.extractAnimeData();

    // 3. Identify and handle specials (Season 0) separately
    // Use config if available to determine special handling
    const specialsHandling = config?.specialsHandling;
    const specialsSeasons = this.handleSpecials(
      tmdbSeasons,
      skyhookEpisodes,
      specialsHandling,
    );

    // 4. Process regular seasons using config when available
    const regularSeasons = this.correlateRegularSeasons(
      tmdbSeasons,
      skyhookEpisodes,
      animeData,
      config,
    );

    // 5. Combine and return all seasons
    return [...specialsSeasons, ...regularSeasons];
  }

  /**
   * Checks if there's enough data to attempt correlation
   */
  private canCorrelate(): boolean {
    return !!(this.tmdb || this.skyhook || this.notify);
  }

  /**
   * Extracts TmdbSeason objects from the source data
   */
  private extractTmdbSeasons(): TmdbSeason[] {
    return this.tmdb?.seasons || [];
  }

  /**
   * Extracts SkyhookEpisode objects from the source data
   */
  private extractSkyhookEpisodes(): SkyhookEpisode[] {
    return this.skyhook?.episodes || [];
  }

  /**
   * Extracts anime data, transforming it into a usable format
   */
  private extractAnimeData(): {
    seasons: number;
    episodes: Array<
      { id: number; number: number; type: string; title: string }
    >;
  } | undefined {
    if (!this.notify) return undefined;

    // Extract episode data from anime source
    const totalEpisodes = this.notify.episodeCount || 0;
    const totalSeasons = this.calculateAnimeSeasons(this.notify);

    // Create a basic representation of anime episodes
    const episodes = Array.from({ length: totalEpisodes }, (_, i) => {
      const isSpecial = i >= totalEpisodes;
      return {
        id: i + 1,
        number: isSpecial ? i - totalEpisodes + 1 : i + 1,
        type: isSpecial ? 'ova' : 'regular',
        title: '',
      };
    });

    return {
      seasons: totalSeasons,
      episodes,
    };
  }

  /**
   * Calculates the number of anime seasons/cours
   */
  private calculateAnimeSeasons(anime: NotifyAnime): number {
    // Estimate based on episode count (rough approximation)
    const episodeCount = anime.episodeCount || 0;
    if (episodeCount <= 0) return 1;

    if (episodeCount <= 13) return 1;
    if (episodeCount <= 26) return 2;
    if (episodeCount <= 39) return 3;
    if (episodeCount <= 52) return 4;

    return Math.ceil(episodeCount / 12); // Rough estimate based on typical cours length
  }

  /**
   * Handles Season 0 / Specials separately
   */
  private handleSpecials(
    tmdbSeasons: TmdbSeason[],
    skyhookEpisodes: SkyhookEpisode[],
    _specialsHandling?: 'standalone' | 'integrated' | 'distributed',
  ): EnhancedMergedSeason[] {
    // Find Season 0 if it exists
    const specialSeason = tmdbSeasons.find((season) =>
      season.season_number === 0
    );
    if (!specialSeason) return [];

    // Find corresponding Skyhook episodes
    const specialEpisodes = skyhookEpisodes.filter((episode) =>
      episode.seasonNumber === 0
    );
    if (specialEpisodes.length === 0) return [];

    // Get anime data if available
    const animeData = this.extractAnimeData();

    // Detect specials type and handling strategy
    const specialsType = SpecialsDetector.detectSpecialsType(
      specialSeason,
      specialEpisodes,
      animeData,
    );

    // Get regular seasons for integration/distribution logic
    const regularSeasons = tmdbSeasons.filter((season) =>
      season.season_number > 0
    );

    // Apply the appropriate handling strategy
    switch (specialsType) {
      case MappingPattern.SPECIALS_STANDALONE:
        return [
          this.createStandaloneSpecialsSeason(
            specialSeason,
            specialEpisodes,
            animeData,
          ),
        ];

      case MappingPattern.SPECIALS_INTEGRATED:
        return this.createIntegratedSpecialsSeason(
          specialSeason,
          specialEpisodes,
          regularSeasons,
          skyhookEpisodes,
          animeData,
        );

      case MappingPattern.SPECIALS_DISTRIBUTED:
        return this.createDistributedSpecialsSeason(
          specialSeason,
          specialEpisodes,
          regularSeasons,
          skyhookEpisodes,
          animeData,
        );

      default:
        return [
          this.createStandaloneSpecialsSeason(
            specialSeason,
            specialEpisodes,
            animeData,
          ),
        ];
    }
  }

  /**
   * Creates a standalone season for specials
   */
  private createStandaloneSpecialsSeason(
    specialSeason: TmdbSeason,
    specialEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedSeason {
    // Get specials mapping data
    const specialsMapping = SpecialsDetector.analyzeSpecials(
      specialSeason,
      specialEpisodes,
      [],
      animeData,
    );

    // Ensure required fields are present for MergedSeason compatibility
    const enhancedSpecialSeason: EnhancedMergedSeason = {
      ...specialSeason,
      images: specialSeason.images || { backdrops: [], posters: [], logos: [] }, // Ensure non-null images
      poster_path: specialSeason.poster_path || '', // Ensure non-null poster_path
      episodes: specialEpisodes.map((skyhookEpisode, index) => {
        const tmdbEpisode: TmdbEpisode = specialSeason.episodes?.[index] || {
          id: -1,
          air_date: skyhookEpisode.airDate?.toString() || '',
          episode_number: skyhookEpisode.episodeNumber,
          episode_type: 'standard',
          name: skyhookEpisode.title || '',
          overview: skyhookEpisode.overview || '',
          production_code: '',
          season_number: 0,
          still_path: '',
          vote_average: 0,
          vote_count: 0,
          crew: [],
          guest_stars: [],
          show_id: '',
          runtime: 0,
        };

        return this.mergeEpisodeData(
          tmdbEpisode,
          skyhookEpisode,
          'Standalone special episode',
          animeData,
        );
      }),
      isSpecial: true,
      mappingPattern: MappingPattern.SPECIALS_STANDALONE,
      specialsMapping,
      viewingOrder: specialsMapping.chronologicalPosition === 'before'
        ? 'Watch before main series'
        : specialsMapping.chronologicalPosition === 'after'
        ? 'Watch after main series'
        : 'Watch alongside main series',
    };

    return enhancedSpecialSeason;
  }

  /**
   * Creates seasons with integrated specials
   */
  private createIntegratedSpecialsSeason(
    specialSeason: TmdbSeason,
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
    allSkyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedSeason[] {
    // Get specials mapping data
    const specialsMapping = SpecialsDetector.analyzeSpecials(
      specialSeason,
      specialEpisodes,
      regularSeasons,
      animeData,
    );

    // If no target seasons specified, return as standalone
    if (
      !specialsMapping.targetSeasons ||
      specialsMapping.targetSeasons.length === 0
    ) {
      return [
        this.createStandaloneSpecialsSeason(
          specialSeason,
          specialEpisodes,
          animeData,
        ),
      ];
    }

    // Create enhanced seasons with integrated specials
    return regularSeasons
      .filter((season) =>
        specialsMapping.targetSeasons?.includes(season.season_number)
      )
      .map((season) => {
        // Find corresponding regular episodes
        const regularEpisodes = allSkyhookEpisodes.filter(
          (episode) => episode.seasonNumber === season.season_number,
        );

        // Find specials that belong to this season
        const seasonSpecials = specialEpisodes.filter((special) => {
          // Check if this special explicitly references this season
          if (
            special.airedBeforeSeasonNumber === season.season_number ||
            special.airedAfterSeasonNumber === season.season_number
          ) {
            return true;
          }

          // If there's only one target season, all specials belong to it
          if (specialsMapping.targetSeasons?.length === 1) {
            return true;
          }

          // Otherwise, distribute specials evenly (simple approach)
          const seasonIndex = regularSeasons.findIndex((s) =>
            s.season_number === season.season_number
          );
          const specialIndex = specialEpisodes.indexOf(special);
          return specialIndex % regularSeasons.length === seasonIndex;
        });

        // Create enhanced season with integrated specials
        return this.createEnhancedSeasonWithSpecials(
          season,
          regularEpisodes,
          seasonSpecials,
          specialSeason,
          specialsMapping,
          animeData,
        );
      });
  }

  /**
   * Creates seasons with distributed specials
   */
  private createDistributedSpecialsSeason(
    specialSeason: TmdbSeason,
    specialEpisodes: SkyhookEpisode[],
    regularSeasons: TmdbSeason[],
    allSkyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedSeason[] {
    // Get specials mapping data
    const specialsMapping = SpecialsDetector.analyzeSpecials(
      specialSeason,
      specialEpisodes,
      regularSeasons,
      animeData,
    );

    // If no mappings or target seasons, return as standalone
    if (
      !specialsMapping.episodeMappings || !specialsMapping.targetSeasons ||
      specialsMapping.targetSeasons.length === 0
    ) {
      return [
        this.createStandaloneSpecialsSeason(
          specialSeason,
          specialEpisodes,
          animeData,
        ),
      ];
    }

    // Create a map of season number -> special episodes for that season
    const seasonToSpecialsMap: Record<number, SkyhookEpisode[]> = {};

    // Distribute specials according to mapping
    specialEpisodes.forEach((special) => {
      const mapping = specialsMapping.episodeMappings?.[special.episodeNumber];
      if (mapping) {
        if (!seasonToSpecialsMap[mapping.seasonNum]) {
          seasonToSpecialsMap[mapping.seasonNum] = [];
        }
        seasonToSpecialsMap[mapping.seasonNum].push(special);
      }
    });

    // Create enhanced seasons with distributed specials
    return regularSeasons
      .filter((season) =>
        specialsMapping.targetSeasons?.includes(season.season_number) ||
        seasonToSpecialsMap[season.season_number]?.length > 0
      )
      .map((season) => {
        // Find corresponding regular episodes
        const regularEpisodes = allSkyhookEpisodes.filter(
          (episode) => episode.seasonNumber === season.season_number,
        );

        // Get specials for this season
        const seasonSpecials = seasonToSpecialsMap[season.season_number] || [];

        // Create enhanced season with distributed specials
        return this.createEnhancedSeasonWithSpecials(
          season,
          regularEpisodes,
          seasonSpecials,
          specialSeason,
          specialsMapping,
          animeData,
        );
      });
  }

  /**
   * Creates an enhanced season with specials integrated
   */
  private createEnhancedSeasonWithSpecials(
    season: TmdbSeason,
    regularEpisodes: SkyhookEpisode[],
    specialEpisodes: SkyhookEpisode[],
    specialSeason: TmdbSeason,
    specialsMapping: SpecialsMapping,
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedSeason {
    // Merge regular and special episodes
    const allEpisodes = [...regularEpisodes];

    // Insert specials in the right positions
    specialEpisodes.forEach((special) => {
      // Check for explicit position
      const mapping = specialsMapping.episodeMappings?.[special.episodeNumber];
      if (mapping && mapping.seasonNum === season.season_number) {
        // Create a copy with adjusted episode number for proper sorting
        const adjustedSpecial = {
          ...special,
          episodeNumber: mapping.episodeNum,
          isSpecial: true,
        };
        allEpisodes.push(adjustedSpecial);
      } else if (
        special.airedBeforeEpisodeNumber !== undefined &&
        special.airedBeforeSeasonNumber === season.season_number
      ) {
        // Insert before the referenced episode
        const adjustedSpecial = {
          ...special,
          episodeNumber: special.airedBeforeEpisodeNumber - 0.5,
          isSpecial: true,
        };
        allEpisodes.push(adjustedSpecial);
      } else if (
        special.airedAfterEpisodeNumber !== undefined &&
        special.airedAfterSeasonNumber === season.season_number
      ) {
        // Insert after the referenced episode
        const adjustedSpecial = {
          ...special,
          episodeNumber: special.airedAfterEpisodeNumber + 0.5,
          isSpecial: true,
        };
        allEpisodes.push(adjustedSpecial);
      } else {
        // Default placement at end of season
        const maxEpisodeNumber = Math.max(
          ...regularEpisodes.map((ep) => ep.episodeNumber),
          0,
        );
        const adjustedSpecial = {
          ...special,
          episodeNumber: maxEpisodeNumber + (special.episodeNumber * 0.1),
          isSpecial: true,
        };
        allEpisodes.push(adjustedSpecial);
      }
    });

    // Sort episodes by episode number
    allEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    // Create the enhanced season
    const enhancedSeason: EnhancedMergedSeason = {
      ...season,
      poster_path: season.poster_path || '', // Ensure non-null poster_path
      images: season.images || { backdrops: [], posters: [], logos: [] }, // Ensure non-null images
      episodes: allEpisodes.map((episode) => {
        const isSpecial = ('isSpecial' in episode) ? episode.isSpecial : false;
        const originalSeason = isSpecial ? specialSeason : season;

        // For specials, find the original TMDb episode
        let tmdbEpisode: TmdbEpisode | undefined;
        if (isSpecial) {
          const originalEpisodeNumber = specialEpisodes.find((s) =>
            s.tvdbId === episode.tvdbId
          )?.episodeNumber;
          tmdbEpisode = originalSeason.episodes?.find((e) =>
            String(e.episode_number) === String(originalEpisodeNumber)
          );
        } else {
          tmdbEpisode = originalSeason.episodes?.find((e) =>
            String(e.episode_number) === String(episode.episodeNumber)
          );
        }

        if (!tmdbEpisode) {
          tmdbEpisode = {
            id: -1,
            air_date: episode.airDate.toString() || '',
            episode_number: episode.episodeNumber,
            episode_type: 'standard',
            name: episode.title || '',
            overview: episode.overview || '',
            production_code: '',
            season_number: isSpecial ? 0 : season.season_number,
            still_path: '',
            vote_average: 0,
            vote_count: 0,
            crew: [],
            guest_stars: [],
            show_id: '',
            runtime: 0,
          };
        }

        return this.mergeEpisodeData(
          tmdbEpisode!,
          episode,
          isSpecial ? 'Integrated special episode' : 'Regular episode',
          animeData,
        );
      }),
      specialsMapping: specialEpisodes.length > 0 ? specialsMapping : undefined,
      mappingPattern: specialEpisodes.length > 0
        ? (specialsMapping.integrationStrategy === 'distributed'
          ? MappingPattern.SPECIALS_DISTRIBUTED
          : MappingPattern.SPECIALS_INTEGRATED)
        : MappingPattern.SEQUENTIAL,
    };

    return enhancedSeason;
  }

  /**
   * Correlates regular (non-special) seasons
   */
  private correlateRegularSeasons(
    tmdbSeasons: TmdbSeason[],
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
    config?: AnimeSeasonConfig,
  ): EnhancedMergedSeason[] {
    // Filter out Season 0
    const regularTmdbSeasons = tmdbSeasons.filter((season) =>
      season.season_number > 0
    );

    return regularTmdbSeasons.map((tmdbSeason) => {
      // Find corresponding Skyhook episodes for this season
      const seasonEpisodes = skyhookEpisodes.filter(
        (episode) => episode.seasonNumber === tmdbSeason.season_number,
      );

      // Determine mapping pattern for this season
      const mappingPattern = PatternDetector.identifyMappingPattern(
        tmdbSeason,
        seasonEpisodes,
        animeData,
        config,
      );

      // Create enhanced season
      return {
        ...tmdbSeason,
        episodes: this.correlateEpisodes(
          tmdbSeason.episodes || [],
          seasonEpisodes,
          mappingPattern,
          animeData,
        ),
        mappingPattern,
      } as EnhancedMergedSeason;
    });
  }

  /**
   * Correlates episodes between TMDb and Skyhook
   */
  private correlateEpisodes(
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
    mappingPattern: MappingPattern,
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode[] {
    // Different correlation logic based on mapping pattern
    switch (mappingPattern) {
      case MappingPattern.SEQUENTIAL:
        return this.correlateSequentialEpisodes(
          tmdbEpisodes,
          skyhookEpisodes,
          animeData,
        );

      case MappingPattern.SPLIT_COURS:
        return this.correlateSplitCoursEpisodes(
          tmdbEpisodes,
          skyhookEpisodes,
          animeData,
        );

      case MappingPattern.MERGED_SEASONS:
        return this.correlateMergedSeasonsEpisodes(
          tmdbEpisodes,
          skyhookEpisodes,
          animeData,
        );

      case MappingPattern.REARRANGED:
        return this.correlateRearrangedEpisodes(
          tmdbEpisodes,
          skyhookEpisodes,
          animeData,
        );

      default:
        return this.correlateSequentialEpisodes(
          tmdbEpisodes,
          skyhookEpisodes,
          animeData,
        );
    }
  }

  /**
   * Correlates episodes in a sequential pattern (direct 1:1 mapping)
   */
  private correlateSequentialEpisodes(
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode[] {
    return zip(tmdbEpisodes, skyhookEpisodes).map(
      ([tmdbEpisode, skyhookEpisode]) => {
        if (!tmdbEpisode || !skyhookEpisode) {
          // Handle case where one source has more episodes than the other
          const baseEpisode = tmdbEpisode || {
            id: -1,
            air_date: skyhookEpisode?.airDate || '',
            episode_number: skyhookEpisode?.episodeNumber || 0,
            name: skyhookEpisode?.title || '',
            overview: skyhookEpisode?.overview || '',
            production_code: '',
            season_number: skyhookEpisode?.seasonNumber || 0,
            still_path: '',
            vote_average: 0,
            vote_count: 0,
            crew: [],
            guest_stars: [],
            show_id: '',
            runtime: 0,
          };

          const baseSkyhook = skyhookEpisode;

          const mappingNote = tmdbEpisode
            ? 'TMDb-only episode'
            : 'Skyhook-only episode';

          return this.mergeEpisodeData(
            baseEpisode,
            baseSkyhook,
            mappingNote,
            animeData,
          );
        }

        // Both sources have matching episode data
        return this.mergeEpisodeData(
          tmdbEpisode,
          skyhookEpisode,
          'Direct correlation between sources',
          animeData,
        );
      },
    );
  }

  /**
   * Correlates episodes in a split cours pattern
   */
  private correlateSplitCoursEpisodes(
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode[] {
    // For split cours mapping, we need to estimate how episodes would be split
    // This is a simplistic approach that would need refinement with real anime data

    // Simple approach: just do sequential mapping but note that it's actually split cours
    return this.correlateSequentialEpisodes(
      tmdbEpisodes,
      skyhookEpisodes,
      animeData,
    )
      .map((episode) => {
        // Mark this as a split cours episode
        return {
          ...episode,
          provenance: {
            ...episode.provenance,
            mappingNotes:
              `${episode.provenance.mappingNotes} (part of split cours anime)`,
          },
        };
      });
  }

  /**
   * Correlates episodes in a merged seasons pattern
   */
  private correlateMergedSeasonsEpisodes(
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode[] {
    // Simple approach: just do sequential mapping but note that it's actually merged seasons
    return this.correlateSequentialEpisodes(
      tmdbEpisodes,
      skyhookEpisodes,
      animeData,
    )
      .map((episode) => {
        // Mark this as a merged seasons episode
        return {
          ...episode,
          provenance: {
            ...episode.provenance,
            mappingNotes:
              `${episode.provenance.mappingNotes} (part of merged anime seasons)`,
          },
        };
      });
  }

  /**
   * Correlates episodes in a rearranged pattern
   */
  private correlateRearrangedEpisodes(
    tmdbEpisodes: TmdbEpisode[],
    skyhookEpisodes: SkyhookEpisode[],
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode[] {
    // For rearranged episodes, we need to handle airedBefore/airedAfter logic

    // First, create a map of episode numbers to TMDb episodes
    const tmdbEpisodeMap: Record<number, TmdbEpisode> = {};
    tmdbEpisodes.forEach((episode) => {
      tmdbEpisodeMap[Number(episode.episode_number)] = episode;
    });

    // Create merged episodes with proper ordering information
    return skyhookEpisodes.map((skyhookEpisode) => {
      const tmdbEpisode = tmdbEpisodeMap[skyhookEpisode.episodeNumber] || {
        id: -1,
        air_date: skyhookEpisode.airDate || '',
        episode_number: skyhookEpisode.episodeNumber,
        name: skyhookEpisode.title || '',
        overview: skyhookEpisode.overview || '',
        production_code: '',
        season_number: skyhookEpisode.seasonNumber,
        still_path: '',
        vote_average: 0,
        vote_count: 0,
        crew: [],
        guest_stars: [],
        show_id: '',
        runtime: 0,
      };

      // Construct mapping note
      let mappingNote = 'Rearranged episode order';

      if (
        skyhookEpisode.airedBeforeSeasonNumber !== undefined &&
        skyhookEpisode.airedBeforeEpisodeNumber !== undefined
      ) {
        mappingNote +=
          ` (aired before S${skyhookEpisode.airedBeforeSeasonNumber}E${skyhookEpisode.airedBeforeEpisodeNumber})`;
      }

      if (
        skyhookEpisode.airedAfterSeasonNumber !== undefined &&
        skyhookEpisode.airedAfterEpisodeNumber !== undefined
      ) {
        mappingNote +=
          ` (aired after S${skyhookEpisode.airedAfterSeasonNumber}E${skyhookEpisode.airedAfterEpisodeNumber})`;
      }

      return this.mergeEpisodeData(
        tmdbEpisode,
        skyhookEpisode,
        mappingNote,
        animeData,
      );
    });
  }

  /**
   * Merges episode data from TMDb and Skyhook sources
   */
  private mergeEpisodeData(
    tmdbEpisode: TmdbEpisode,
    skyhookEpisode: SkyhookEpisode,
    mappingNote: string,
    animeData?: {
      seasons: number;
      episodes: Array<
        { id: number; number: number; type: string; title: string }
      >;
    },
  ): EnhancedMergedEpisode {
    // Determine anime episode ID if available
    let animeEpisodeIds;
    if (animeData && this.notify) {
      // Find matching anime episode (simplified logic)
      const absoluteNumber = skyhookEpisode.absoluteEpisodeNumber ||
        (skyhookEpisode.seasonNumber * 100 + skyhookEpisode.episodeNumber);

      if (
        absoluteNumber && typeof this.notify.episodes === 'number' &&
        absoluteNumber <= this.notify.episodes
      ) {
        animeEpisodeIds = {
          notify: absoluteNumber,
        };
      }
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      tmdbEpisode,
      skyhookEpisode,
      animeEpisodeIds !== undefined,
    );

    return {
      // Basic merged episode data
      id: tmdbEpisode.id,
      seasonNumber: skyhookEpisode.seasonNumber,
      episodeNumber: skyhookEpisode.episodeNumber,
      name: tmdbEpisode.name || skyhookEpisode.title || '',
      title: skyhookEpisode.title || tmdbEpisode.name || '',
      airDate: skyhookEpisode.airDate || tmdbEpisode.air_date || '',
      overview: skyhookEpisode.overview || tmdbEpisode.overview || '',

      // Skyhook-specific fields
      tvdbShowId: skyhookEpisode.tvdbShowId,
      tvdbId: skyhookEpisode.tvdbId,
      absoluteEpisodeNumber: skyhookEpisode.absoluteEpisodeNumber,
      airedBeforeSeasonNumber: skyhookEpisode.airedBeforeSeasonNumber,
      airedBeforeEpisodeNumber: skyhookEpisode.airedBeforeEpisodeNumber,
      airedAfterSeasonNumber: skyhookEpisode.airedAfterSeasonNumber,
      airedAfterEpisodeNumber: skyhookEpisode.airedAfterEpisodeNumber,
      airDateUtc: skyhookEpisode.airDateUtc,
      runtime: skyhookEpisode.runtime || tmdbEpisode.runtime || 0,
      finaleType: skyhookEpisode.finaleType,
      image: skyhookEpisode.image,

      // TMDb-specific fields
      tmdbShowId: tmdbEpisode.show_id || '',
      productionCode: tmdbEpisode.production_code || '',
      stillPath: tmdbEpisode.still_path || '',
      voteAverage: tmdbEpisode.vote_average || 0,
      voteCount: tmdbEpisode.vote_count || 0,
      staff: [...tmdbEpisode.crew, ...tmdbEpisode.guest_stars],

      // Anime-specific fields
      animeEpisodeIds,

      // Provenance tracking
      provenance: {
        sourceType: tmdbEpisode.id > 0 && skyhookEpisode.tvdbId > 0
          ? 'merged'
          : (tmdbEpisode.id > 0 ? 'tmdb' : 'skyhook'),
        originalIds: {
          tmdb: tmdbEpisode.id > 0 ? tmdbEpisode.id : undefined,
          tvdb: skyhookEpisode.tvdbId > 0 ? skyhookEpisode.tvdbId : undefined,
        },
        confidence: confidenceScore,
        mappingNotes: mappingNote,
      },
    };
  }

  /**
   * Calculates a confidence score for episode mapping
   */
  private calculateConfidenceScore(
    tmdbEpisode: TmdbEpisode,
    skyhookEpisode: SkyhookEpisode,
    hasAnimeMatch: boolean,
  ): number {
    let score = 0.5; // Start with neutral confidence

    // If we have both TMDb and Skyhook data, higher confidence
    if (tmdbEpisode.id > 0 && skyhookEpisode.tvdbId > 0) {
      score += 0.3;
    }

    // If episode titles match, higher confidence
    if (
      tmdbEpisode.name &&
      skyhookEpisode.title &&
      tmdbEpisode.name.toLowerCase() === skyhookEpisode.title.toLowerCase()
    ) {
      score += 0.1;
    }

    // If air dates match, higher confidence
    if (
      tmdbEpisode.air_date &&
      skyhookEpisode.airDate &&
      tmdbEpisode.air_date === skyhookEpisode.airDate?.toString()
    ) {
      score += 0.1;
    }

    // If we have anime match, higher confidence
    if (hasAnimeMatch) {
      score += 0.1;
    }

    // Cap at 0.99 (never 100% confident)
    return Math.min(score, 0.99);
  }

  /**
   * Gets configuration for the current show if available
   */
  private getConfiguration(): AnimeSeasonConfig | undefined {
    const tmdbId = this.tmdb?.id ? Number(this.tmdb.id) : undefined;
    const tvdbId = this.skyhook?.tvdbId;
    const animeId = this.notify?.id ? Number(this.notify.id) : undefined;

    return getMappingConfig(tmdbId, tvdbId, animeId);
  }
}

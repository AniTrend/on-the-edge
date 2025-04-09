import { MergedEpisode, MergedSeason } from '../../../transformer/types.ts';
import { EpisodeProvenance } from './provenance.ts';
import { MappingPattern } from './mapping-patterns.ts';
import { SpecialsMapping } from './specials.ts';

/**
 * Extended MergedEpisode interface with provenance tracking
 */
export interface EnhancedMergedEpisode extends MergedEpisode {
  provenance: EpisodeProvenance;
  animeEpisodeIds?: {
    mal?: number;
    anilist?: number;
    notify?: number;
  };
}

/**
 * Extended MergedSeason interface with specials info
 */
export interface EnhancedMergedSeason extends MergedSeason {
  episodes: EnhancedMergedEpisode[];
  isSpecial?: boolean;
  specialsMapping?: SpecialsMapping;
  mappingPattern?: MappingPattern;
  viewingOrder?: string;
}

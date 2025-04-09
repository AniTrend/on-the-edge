/**
 * Defines the relationship pattern between Western seasons and anime releases
 */
export enum MappingPattern {
  SEQUENTIAL, // Direct 1:1 mapping between Western and anime seasons
  SPLIT_COURS, // One Western season maps to multiple anime cours
  MERGED_SEASONS, // Multiple Western seasons map to one anime season
  REARRANGED, // Episodes are in different order
  SPECIALS_STANDALONE, // Season 0/specials remain separate
  SPECIALS_INTEGRATED, // Specials belong within regular seasons
  SPECIALS_DISTRIBUTED, // Specials are distributed across multiple seasons
  CUSTOM, // Custom mapping needed
}

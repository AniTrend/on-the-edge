/**
 * Defines a rule for mapping episodes between Western and anime sources
 */
export interface MappingRule {
  sourceType: 'western' | 'anime';
  sourceId: string;
  seasonNumber: number;
  episodeOffset: number;
  targetType: 'western' | 'anime';
  targetId: string;
  targetSeasonNumber: number;
}

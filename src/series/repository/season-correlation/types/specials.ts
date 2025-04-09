/**
 * Information about how specials should be handled
 */
export interface SpecialsMapping {
  specialType: 'ova' | 'ona' | 'recap' | 'bonus' | 'crossover' | 'unknown';
  integrationStrategy: 'standalone' | 'season-integrated' | 'distributed';
  targetSeasons?: number[]; // Which seasons these specials relate to
  chronologicalPosition?: 'before' | 'after' | 'during'; // When to watch
  episodeMappings?: Record<number, { seasonNum: number; episodeNum: number }>; // For distributed specials
}

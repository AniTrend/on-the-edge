import { Document } from '@mongodb';
import { MergeResult } from '../aggregator/types.ts';

// Storage representation for episodes list per series
export interface EpisodeDocument extends MergeResult, Document {
  seriesKey: string; // canonical key (e.g., MAL id as string)
  airing: boolean | null; // from Jikan, if show is currently airing
  updatedAt: number; // epoch seconds
}

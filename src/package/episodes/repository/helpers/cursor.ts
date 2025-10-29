import { EntityCursor } from '@scope/database';
import type {
  EpisodeCursorPayload,
  EpisodeFilters,
} from '../../episodes.types.ts';

/**
 * Build a stable hash from seriesKey and filter parameters.
 * Used to invalidate cursors when filters change.
 * @param seriesKey The series identifier
 * @param filters Optional filter parameters
 * @returns A stable hash string (e.g., "v1:12345")
 */
export const buildFilterHash = (
  seriesKey: string,
  filters?: EpisodeFilters,
): string => {
  const parts: string[] = [`s=${seriesKey}`];
  if (filters) {
    if (filters.kind) parts.push(`k=${filters.kind}`);
    if (filters.specialsOnly) parts.push(`sp=1`);
    if (typeof filters.start === 'number') parts.push(`st=${filters.start}`);
    if (typeof filters.end === 'number') parts.push(`en=${filters.end}`);
  }
  const raw = parts.join('&');

  // Simple hash function for stability
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
  }
  return `v1:${Math.abs(h)}`;
};

/**
 * Encode cursor payload to base64 string
 * @param payload Position and hash information
 * @returns Base64 encoded cursor string
 */
export const encodeCursor = (payload: EpisodeCursorPayload): EntityCursor => {
  return btoa(JSON.stringify(payload));
};

/**
 * Decode cursor from base64 string
 * @param cursor Base64 encoded cursor
 * @returns Decoded payload or null if invalid
 */
export const decodeCursor = (
  cursor: EntityCursor,
): EpisodeCursorPayload | null => {
  try {
    const json = atob(cursor);
    const parsed = JSON.parse(json);
    if (typeof parsed.pos === 'number' && typeof parsed.hash === 'string') {
      return parsed as EpisodeCursorPayload;
    }
    return null;
  } catch (_e) {
    return null;
  }
};

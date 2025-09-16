import { EpisodeCursor, EpisodeCursorPayload } from '../../episodes.types.ts';
import { generateHashSync } from './hash.ts';
import { getHashConfig, shouldForceSync } from './hash-config.ts';

type CursorFilters = {
  kind?: string;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
};

/**
 * Build a hash representing active filters with improved collision resistance.
 * Uses configurable hashing strategy with fallbacks for robustness.
 */
export const buildFilterHash = (
  seriesKey: string,
  filters?: CursorFilters,
): string => {
  // Build deterministic filter string
  const parts: string[] = [`s=${seriesKey}`];
  if (filters) {
    if (filters.kind) parts.push(`k=${filters.kind}`);
    if (filters.specialsOnly) parts.push(`sp=1`);
    if (typeof filters.start === 'number') parts.push(`st=${filters.start}`);
    if (typeof filters.end === 'number') parts.push(`en=${filters.end}`);
  }
  const raw = parts.join('&');

  // Use improved hashing with configuration
  const config = getHashConfig();
  const forceSync = shouldForceSync();

  // For cursor operations, we need synchronous hashing to maintain compatibility
  // The async version could be used in future async cursor operations
  const hashMethod = forceSync || config.method === 'sha256'
    ? 'sha256-sync'
    : (config.method || 'sha256-sync');

  return generateHashSync(raw, hashMethod);
};

/**
 * Legacy hash implementation for backward compatibility testing
 * @deprecated Use buildFilterHash with new implementation
 */
export const buildFilterHashLegacy = (
  seriesKey: string,
  filters?: CursorFilters,
): string => {
  const parts: string[] = [`s=${seriesKey}`];
  if (filters) {
    if (filters.kind) parts.push(`k=${filters.kind}`);
    if (filters.specialsOnly) parts.push(`sp=1`);
    if (typeof filters.start === 'number') parts.push(`st=${filters.start}`);
    if (typeof filters.end === 'number') parts.push(`en=${filters.end}`);
  }
  const raw = parts.join('&');
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
  }
  return `v1:${Math.abs(h)}`;
};

export const encodeCursor = (payload: EpisodeCursorPayload): EpisodeCursor => {
  return btoa(JSON.stringify(payload));
};

export const decodeCursor = (
  cursor: EpisodeCursor,
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

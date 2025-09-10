import { EpisodeCursor, EpisodeCursorPayload } from '../../episodes.types.ts';

type CursorFilters = {
  kind?: string;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
};

// Build a hash representing active filters. Phase A: only series id.
export const buildFilterHash = (
  seriesKey: string,
  filters?: CursorFilters,
): string => {
  // Simple stable hash: could upgrade to murmur/sha256 if needed.
  // Keep deterministic ordering of key=value pairs when filters expand.
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

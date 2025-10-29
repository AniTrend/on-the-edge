import { EntityCursor } from '@scope/database';
import type { EpisodeCanonical } from '../../episodes.types.ts';
import { decodeCursor, encodeCursor } from './cursor.ts';

export type PageSlice<T extends EpisodeCanonical = EpisodeCanonical> = {
  data: T[];
  firstPos: number;
  lastPos: number;
};

/**
 * Paginate episodes using cursor-based pagination
 *
 * @param episodes Full episode array to paginate
 * @param opts Pagination options (after, before, limit, hash)
 * @returns Page slice with data and position markers
 */
export function paginate<T extends EpisodeCanonical>(
  episodes: T[],
  opts: {
    after?: EntityCursor;
    before?: EntityCursor;
    limit: number;
    hash: string;
  },
): PageSlice<T> {
  let slice: T[] = [];
  let firstPos = 0;
  let lastPos = -1;

  // Handle backward pagination with before cursor
  if (opts.before) {
    const decoded = decodeCursor(opts.before);
    if (decoded && decoded.hash === opts.hash) {
      const endExclusive = decoded.pos;
      const endIndex = Math.min(endExclusive - 1, episodes.length - 1);
      const startIndex = Math.max(0, endIndex - (opts.limit - 1));
      slice = episodes.slice(startIndex, endIndex + 1);
      firstPos = startIndex;
      lastPos = startIndex + slice.length - 1;
    }
  }

  // Handle forward pagination (default or with after cursor)
  if (slice.length === 0) {
    let startIndex = 0;
    if (opts.after) {
      const decoded = decodeCursor(opts.after);
      if (
        decoded && decoded.hash === opts.hash && decoded.pos >= 0 &&
        decoded.pos < episodes.length
      ) {
        startIndex = decoded.pos + 1;
      }
    }
    slice = episodes.slice(startIndex, startIndex + opts.limit);
    firstPos = startIndex;
    lastPos = startIndex + slice.length - 1;
  }

  return { data: slice, firstPos, lastPos };
}

/**
 * Generate cursor strings for first and last positions
 *
 * @param hash Filter hash for cursor validation
 * @param firstPos First item position in page
 * @param lastPos Last item position in page
 * @param count Number of items in page
 * @returns Object with first and last cursor strings
 */
export function cursors(
  hash: string,
  firstPos: number,
  lastPos: number,
  count: number,
) {
  return {
    first: count > 0 ? encodeCursor({ pos: firstPos, hash }) : undefined,
    last: count > 0 ? encodeCursor({ pos: lastPos, hash }) : undefined,
  };
}

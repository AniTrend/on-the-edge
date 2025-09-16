import type { EpisodeCanonical, EpisodeCursor } from '../../episodes.types.ts';
import { decodeCursor, encodeCursor } from './cursor.ts';

export type PageSlice = {
  data: EpisodeCanonical[];
  firstPos: number;
  lastPos: number;
};

export function paginate(
  episodes: EpisodeCanonical[],
  opts: {
    after?: EpisodeCursor;
    before?: EpisodeCursor;
    limit: number;
    hash: string;
  },
): PageSlice {
  let slice: EpisodeCanonical[] = [];
  let firstPos = 0;
  let lastPos = -1;

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

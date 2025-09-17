import { cursors, paginate } from './paginate.ts';
import type { EpisodeCanonical, EpisodeCursor } from '../../episodes.types.ts';

const ep = (n: number): EpisodeCanonical => ({
  id: n,
  number: n,
  title: { english: `E${n}`, native: null, romanji: null },
  synopsis: null,
  aired: null,
  score: null,
  kind: 'main',
  duration: null,
  url: null,
  themes: { openings: [], endings: [] },
  tvdbShowId: null,
  tvdbId: null,
  tmdbId: null,
  seasonNumber: null,
  episodeNumber: null,
  absoluteEpisodeNumber: null,
  airedBeforeSeasonNumber: null,
  airedBeforeEpisodeNumber: null,
  airedAfterSeasonNumber: null,
  airedAfterEpisodeNumber: null,
  image: null,
  poster: null,
});

// Minimal encode/decode cursor helpers to generate valid cursors with matching hash
const encode = (payload: { pos: number; hash: string }) =>
  btoa(JSON.stringify(payload)) as EpisodeCursor;

Deno.test('paginate: forward from start with limit', () => {
  const episodes = Array.from({ length: 10 }, (_, i) => ep(i + 1));
  const hash = 'h1';
  const res = paginate(episodes, { limit: 3, hash });
  if (res.data.map((e: EpisodeCanonical) => e.id).join(',') !== '1,2,3') {
    throw new Error('expected first 3 episodes');
  }
  const { first, last } = cursors(
    hash,
    res.firstPos,
    res.lastPos,
    res.data.length,
  );
  if (!first || !last) throw new Error('expected cursors');
});

Deno.test('paginate: forward after cursor advances window', () => {
  const episodes = Array.from({ length: 10 }, (_, i) => ep(i + 1));
  const hash = 'h1';
  const after = encode({ pos: 2, hash }); // after position 2 -> next starts at index 3 (id=4)
  const res = paginate(episodes, { limit: 3, hash, after });
  if (res.data.map((e: EpisodeCanonical) => e.id).join(',') !== '4,5,6') {
    throw new Error('expected [4,5,6]');
  }
});

Deno.test('paginate: backward before cursor returns previous window', () => {
  const episodes = Array.from({ length: 10 }, (_, i) => ep(i + 1));
  const hash = 'h1';
  const before = encode({ pos: 5, hash }); // item before pos=5 should be last -> expect [3,4,5]
  const res = paginate(episodes, { limit: 3, hash, before });
  if (res.data.map((e: EpisodeCanonical) => e.id).join(',') !== '3,4,5') {
    throw new Error('expected [3,4,5]');
  }
});

Deno.test('paginate: foreign hash invalidates cursor and falls back to start', () => {
  const episodes = Array.from({ length: 5 }, (_, i) => ep(i + 1));
  const hash = 'h1';
  const after = encode({ pos: 4, hash: 'other' });
  const res = paginate(episodes, { limit: 2, hash, after });
  if (res.data.map((e: EpisodeCanonical) => e.id).join(',') !== '1,2') {
    throw new Error('expected start slice when hash mismatches');
  }
});

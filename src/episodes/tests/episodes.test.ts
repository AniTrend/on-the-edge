import { assert, assertEquals } from '@std/assert';
import {
  buildFilterHash,
  decodeCursor,
  encodeCursor,
} from '../repository/helpers/cursor.ts';
import { toCanonicalEpisode } from '../episodes.types.ts';
import { EpisodesRepository } from '../repository/episodes.repository.ts';
import { clampLimit } from '../episodes.params.ts';
import { Features } from '../../common/types/core.ts';
import type { EpisodeCollection } from '../collection/episode.collection.ts';
import type { EpisodeDocument } from '../store/types.ts';
import { AppFeatures } from '../../common/experiment/types.ts';
import { Instant } from '../../common/helpers/date.ts';

// Minimal in-memory collection for repository DI in tests

// Deterministic tests: optional integrations are gated by experiments.
// We don't inject ctx.state.features by default, so all optional sources remain OFF.

// Minimal Features mock for experiment injection in tests
const makeFeatures = (flags: Partial<AppFeatures>): Features => {
  const table = { ...flags } as Record<string, unknown>;
  const fake: {
    isOn: (k: string) => boolean;
    getFeatureValue: <T>(k: string, d: T) => T;
  } = {
    isOn: (k: string) => Boolean(table[k]) === true,
    getFeatureValue: <T>(k: string, d: T) => (table[k] as T) ?? d,
  };
  return fake as unknown as Features;
};

// In-memory EpisodeCollection for unit tests
const memory: (EpisodeDocument & { _id: string })[] = [];
const getCollection = (): EpisodeCollection => ({
  get(seriesKey: string) {
    return Promise.resolve(
      memory.find((d) => d.seriesKey === seriesKey) ?? null,
    );
  },
  save(doc: EpisodeDocument) {
    const idx = memory.findIndex((d) => d.seriesKey === doc.seriesKey);
    const stored = {
      ...doc,
      _id: idx >= 0 ? memory[idx]._id : crypto.randomUUID(),
    };
    if (idx >= 0) memory[idx] = stored;
    else memory.push(stored);
    return Promise.resolve(stored);
  },
  lastUpdated: function (_seriesKey: string): Promise<Instant | null> {
    return Promise.resolve(0);
  },
});

Deno.test('cursor encode/decode round trip', () => {
  const hash = buildFilterHash('123');
  const cur = encodeCursor({ pos: 5, hash });
  const decoded = decodeCursor(cur);
  assert(decoded);
  assertEquals(decoded!.pos, 5);
  assertEquals(decoded!.hash, hash);
});

Deno.test('repository pagination slicing forward', async () => {
  // Seed memory doc directly
  const seriesKey = '999';
  const episodes = Array.from({ length: 10 }).map((_, i) =>
    toCanonicalEpisode({ mal_id: i + 1, themes: { openings: [], endings: [] } })
  );
  memory.push({
    seriesKey,
    updatedAt: Date.now(),
    episodes,
    airing: null,
    _id: crypto.randomUUID(),
  });

  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  const first = await repo.invoke(Number(seriesKey), { limit: 4 });
  const firstPage = first; // repository guarantees data page object
  assert(firstPage.data);
  assertEquals(firstPage.data.length, 4);
  assertEquals(firstPage.total, 10);
  const after = firstPage.last!;
  const second = await repo.invoke(Number(seriesKey), { limit: 4, after });
  const secondPage = second;
  assert(secondPage.data);
  assertEquals(secondPage.data[0].id, 5); // Should start at next item
  assertEquals(secondPage.total, 10);
});

Deno.test('limit clamping (negative and over max)', async () => {
  const seriesKey = '1001';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 60 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  // Over max (set artificially above 100 in controller; repository itself just slices) use large limit inc to verify slice length matches requested but constrained by available slice window
  const over = await repo.invoke(Number(seriesKey), { limit: 500 });
  assert(over);
  const overPage = over;
  assert(overPage.data);
  assertEquals(overPage.data.length, 60); // only 60 exist
  assertEquals(overPage.total, 60);
});

Deno.test('invalid cursor ignored (foreign hash)', async () => {
  const seriesKey = '2002';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 5 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  // Craft cursor with mismatching hash
  const bogus = btoa(JSON.stringify({ pos: 2, hash: 'v1:999999' }));
  const page = await repo.invoke(Number(seriesKey), { limit: 2, after: bogus });
  const pg = page;
  // Since hash mismatches, should start from beginning
  if (pg.data) {
    assertEquals(pg.data[0].id, 1);
  }
  assertEquals(pg.total, 5);
});

Deno.test('backward pagination using before cursor', async () => {
  const seriesKey = '3003';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 12 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  // Get first forward page (size 5)
  const first = await repo.invoke(Number(seriesKey), { limit: 5 });
  const firstPage = first;
  const second = await repo.invoke(Number(seriesKey), {
    limit: 5,
    after: firstPage.last,
  });
  const secondPage = second;
  // Use before cursor of second page first item to go backward window (simulate a UI wanting previous page)
  const beforeCursor = encodeCursor({
    pos: (secondPage.first ? decodeCursor(secondPage.first)?.pos! : 5),
    hash: buildFilterHash(seriesKey),
  });
  const backward = await repo.invoke(Number(seriesKey), {
    limit: 5,
    before: beforeCursor,
  });
  const backwardPage = backward;
  // Expect backward page to match first page data ids
  const backwardIds = backwardPage!.data!.map((e) => e.id);
  const firstIds = firstPage!.data!.map((e) => e.id);
  assertEquals(backwardIds, firstIds);
});

Deno.test('pagination invariants hold across forward and backward cursors', async () => {
  const seriesKey = '4004';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 15 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        title: `Ep ${i + 1}`,
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  const page1 = await repo.invoke(Number(seriesKey), { limit: 6 });
  const p1 = page1;
  assert(p1.data);
  assertEquals(p1.total, 15);
  // Page2 via after cursor
  const page2 = await repo.invoke(Number(seriesKey), {
    limit: 6,
    after: p1.last,
  });
  const p2 = page2;
  assert(p2.data);
  // Back to page1 via before cursor from p2
  const before = p2.first!;
  const prev = await repo.invoke(Number(seriesKey), { limit: 6, before });
  const pPrev = prev;
  assertEquals(pPrev.data!.map((e) => e.id), p1!.data.map((e) => e.id));
});

Deno.test('clampLimit behavior', () => {
  // default when undefined
  const a = clampLimit(undefined);
  // negative resets to default
  const b = clampLimit('-5');
  // zero resets to default
  const c = clampLimit('0');
  // valid inside bounds
  const d = clampLimit('30');
  // over max clamps to 100
  const e = clampLimit('5000');
  // non numeric returns default
  const f = clampLimit('abc');
  // Assertions (default = 25, max = 100)
  assertEquals(a, 25);
  assertEquals(b, 25);
  assertEquals(c, 25);
  assertEquals(d, 30);
  assertEquals(e, 100);
  assertEquals(f, 25);
});

Deno.test('filter hash varies with filters', () => {
  const base = buildFilterHash('X');
  const withKind = buildFilterHash('X', { kind: 'ova' });
  const withSpecials = buildFilterHash('X', { specialsOnly: true });
  const withRange = buildFilterHash('X', { start: 3, end: 7 });
  // Ensure changes are reflected
  assert(base !== withKind);
  assert(base !== withSpecials);
  assert(base !== withRange);
});

Deno.test('repository filters: kind only', async () => {
  const seriesKey = '5005';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = [
      toCanonicalEpisode({
        mal_id: 1,
        title: 'Ep 1',
        kind: 'main',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 2,
        title: 'Ep 2 OVA',
        kind: 'ova',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 3,
        title: 'Ep 3',
        kind: 'main',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 4,
        title: 'Ep 4 OVA',
        kind: 'ova',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 5,
        title: 'Ep 5',
        kind: 'main',
        themes: { openings: [], endings: [] },
      }),
    ];
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  const res = await repo.invoke(Number(seriesKey), {
    limit: 10,
    filters: { kind: 'ova' },
  });
  const page = res;
  assert(page.data);
  assertEquals(page.data.map((e) => e.id), [2, 4]);
  assertEquals(page.total, 2);
});

Deno.test('repository filters: specialsOnly', async () => {
  const seriesKey = '6006';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = [
      toCanonicalEpisode({
        mal_id: 1,
        kind: 'main',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 2,
        kind: 'ova',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 3,
        kind: 'ona',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 4,
        kind: 'recap',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 5,
        kind: 'filler',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 7,
        kind: 'special',
        themes: { openings: [], endings: [] },
      }),
      toCanonicalEpisode({
        mal_id: 6,
        kind: 'main',
        themes: { openings: [], endings: [] },
      }),
    ];
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  const res = await repo.invoke(Number(seriesKey), {
    limit: 10,
    filters: { specialsOnly: true },
  });
  const page = res;
  assert(page.data);
  assertEquals(page.data.map((e) => e.id), [2, 3, 4, 5, 7]);
  assertEquals(page.total, 5);
});

Deno.test('repository filters: range with forward/backward pagination invariants', async () => {
  const seriesKey = '7007';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 20 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        kind: 'main',
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  const filters = { start: 5, end: 12 } as const;
  const page1 = await repo.invoke(Number(seriesKey), { limit: 3, filters });
  const p1 = page1;
  assertEquals(p1.data!.map((e) => e.id), [5, 6, 7]);
  assertEquals(p1.total, 8);
  const page2 = await repo.invoke(Number(seriesKey), {
    limit: 3,
    filters,
    after: p1.last,
  });
  const p2 = page2;
  assertEquals(p2.data!.map((e) => e.id), [8, 9, 10]);
  // Go back using before cursor from second page
  const back = await repo.invoke(Number(seriesKey), {
    limit: 3,
    filters,
    before: p2.first,
  });
  const pb = back;
  assertEquals(pb.data!.map((e) => e.id), [5, 6, 7]);
});

Deno.test('cursors are invalid across different filter hashes', async () => {
  const seriesKey = '8008';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 10 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        kind: i % 2 === 0 ? 'main' : 'ova',
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), makeFeatures({}));
  // Get a cursor using kind=main
  const mainP1 = await repo.invoke(Number(seriesKey), {
    limit: 2,
    filters: { kind: 'main' },
  });
  const cur = mainP1.last;
  // Now request with different filters (kind=ova) and the 'after' cursor; should ignore and start from beginning of the new filtered set
  const ovaP = await repo.invoke(Number(seriesKey), {
    limit: 2,
    filters: { kind: 'ova' },
    after: cur,
  });
  const ids = ovaP.data!.map((e) => e.id);
  // kinds alternate, so ova ids start at 2
  assertEquals(ids, [2, 4]);
});

Deno.test('experiment features: title similarity threshold wiring (no-op safe)', async () => {
  // This feature only influences alignment in multi-source merges; safe to inject and run repository
  const features = makeFeatures({ 'episode-align-title-sim': 0.9 });
  const seriesKey = '9090';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    const episodes = Array.from({ length: 4 }).map((_, i) =>
      toCanonicalEpisode({
        mal_id: i + 1,
        title: `Ep ${i + 1}`,
        themes: { openings: [], endings: [] },
      })
    );
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes,
      airing: null,
      _id: crypto.randomUUID(),
    });
  }
  const repo = new EpisodesRepository(getCollection(), features);
  const page = await repo.invoke(Number(seriesKey), { limit: 3 });
  // Basic sanity assertions; the threshold injection should not alter single-source results
  assert(page.data);
  assertEquals(page.data.length, 3);
  assertEquals(page.total, 4);
});

Deno.test('toCanonicalEpisode coerces unknown kind to null', () => {
  // @ts-ignore - intentionally passing unrecognized kind to test guard behavior
  const ep = toCanonicalEpisode({ mal_id: 1, kind: 'unknown-kind' });
  assertEquals(ep.kind, null);
});

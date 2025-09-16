import { assert, assertEquals } from '@std/assert';
import { seriesEpisodes } from '../episodes.controller.ts';
import { toCanonicalEpisode } from '../episodes.types.ts';
import { AppContext, Local } from '../../../common/types/core.ts';
import { setEnvScoped } from '../../../common/testing/env.ts';
import { json, onGet, stubFetch } from '../../../common/testing/net.ts';

// Minimal mock of AppContext & in-memory collection identical to repository unit test approach
interface MemDoc {
  seriesKey: string;
  updatedAt: number;
  episodes: ReturnType<typeof toCanonicalEpisode>[];
  _id: string;
}
const memory: MemDoc[] = [];
const mockCollection = {
  findOne: (q: { seriesKey: string }) =>
    memory.find((d) => d.seriesKey === q.seriesKey),
  updateOne: (
    q: { seriesKey: string },
    u: { $set: Omit<MemDoc, '_id'> & Partial<Pick<MemDoc, '_id'>> },
    _opts: { upsert: boolean },
  ) => {
    const idx = memory.findIndex((d) => d.seriesKey === q.seriesKey);
    const doc: MemDoc = {
      ...(u.$set as MemDoc),
      _id: idx >= 0 ? memory[idx]._id : crypto.randomUUID(),
    };
    if (idx >= 0) memory[idx] = doc;
    else memory.push(doc);
  },
};

// Monkey patch EpisodesRepository collection accessor by injecting state.local.collection (Db-like)
type MockDb = { collection: (name: string) => typeof mockCollection };
const mockCtx = (url: string): AppContext => ({
  request: { url: new URL(url) },
  response: {},
  state: {
    local: ({
      collection: () => mockCollection,
    } as unknown as MockDb) as unknown as Local,
    // Minimal features stub for experiments wiring
    features: {
      isOn: () => false,
      getFeatureValue: <T>(_k: string, d: T) => d,
    } as unknown,
  },
} as unknown as AppContext);

Deno.test('seriesEpisodes basic response returns paged data', async () => {
  const seriesKey = '555';
  if (!memory.find((d) => d.seriesKey === seriesKey)) {
    memory.push({
      seriesKey,
      updatedAt: Date.now(),
      episodes: [1, 2, 3].map((i) =>
        toCanonicalEpisode({ mal_id: i, themes: { openings: [], endings: [] } })
      ),
      _id: crypto.randomUUID(),
    });
  }
  // Avoid outbound ARM call by stubbing YUNA (ARM) endpoint
  const yunaBase = 'https://yuna.test';
  const env = setEnvScoped({ YUNA: yunaBase });
  const s = stubFetch([
    onGet(`${yunaBase}/api/v2/ids`, ({ url }) => {
      const u = new URL(url);
      const source = u.searchParams.get('source');
      const id = Number(u.searchParams.get('id')) || Number(seriesKey);
      if (source === 'anilist') {
        return json({ anilist: id, myanimelist: id });
      }
      return json({});
    }),
  ]);
  const ctx = mockCtx(
    `http://localhost/series/episodes?id=${seriesKey}&limit=2`,
  );
  await seriesEpisodes(ctx);
  interface Resp {
    data: ReturnType<typeof toCanonicalEpisode>[];
    diagnostics?: unknown;
  }
  const body = ctx.response.body as Resp;
  assert(body?.data);
  assertEquals(body.diagnostics, undefined);
  assertEquals(body.data.length, 2);
  s.restore();
  env.restore();
});

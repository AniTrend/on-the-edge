import { getTheXemByTvdb } from './remote/thexem.remote.ts';
import { TheXem, TheXemScene } from './types.ts';
import { TheXemDataModel, TheXemModel } from './remote/types.ts';
import { env } from '@scope/common/core';

const mapScene = (
  s: { season: number; episode: number; absolute: number },
): TheXemScene => ({
  season: Number(s.season),
  episode: Number(s.episode),
  absolute: Number(s.absolute),
});

const mapModel = (m: TheXemModel): TheXem => ({
  scene: mapScene(m.scene),
  tvdb: mapScene(m.tvdb),
  anidb: mapScene(m.anidb),
});

// Simple in-memory cache for TheXEM rows keyed by TVDB id
const xemCache = new Map<number, { at: number; data: TheXem[] }>();

export const getTheXemMappingsByTvdb = async (
  tvdbId: number,
): Promise<TheXem[]> => {
  try {
    const ttlHoursRaw = env<string>('THEXEM_TTL_HOURS');
    const ttlMs = Math.max(1, Number(ttlHoursRaw) || 24) * 60 * 60 * 1000;
    const now = Date.now();
    const cached = xemCache.get(tvdbId);
    if (cached && now - cached.at < ttlMs) return cached.data;
  } catch (_) {
    // ignore env read; proceed without cache TTL
  }
  const data: TheXemDataModel = await getTheXemByTvdb(tvdbId);
  const rows = !data || !Array.isArray(data.data)
    ? []
    : data.data.map(mapModel);
  // store regardless (empty result caches negative lookups for TTL)
  xemCache.set(tvdbId, { at: Date.now(), data: rows });
  return rows;
};

// Build a TVDB->absolute map for quick number normalization. Returns Map<tvdbEpisodeAbs, absolute>
export const buildTvdbAbsoluteMap = (rows: TheXem[]): Map<number, number> => {
  const map = new Map<number, number>();
  for (const r of rows) {
    const tvdbAbs = Number(r.tvdb.absolute);
    const absolute = Number(
      r.scene.absolute || r.anidb.absolute || r.tvdb.absolute,
    );
    if (
      Number.isFinite(tvdbAbs) && Number.isFinite(absolute) && tvdbAbs > 0 &&
      absolute > 0
    ) {
      if (!map.has(tvdbAbs)) map.set(tvdbAbs, absolute); // first-wins for stability
    }
  }
  return map;
};

// Clear the in-memory TheXEM cache (useful for tests or operational resets)
export const clearTheXemCache = (): void => {
  try {
    xemCache.clear();
  } catch (_) {
    // no-op if map is unavailable
  }
};

// Build a TVDB season+episode -> absolute map. Key format: `${season}-${episode}`
export const buildTvdbSeasonEpisodeToAbsoluteMap = (
  rows: TheXem[],
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const s = Number(r.tvdb.season);
    const e = Number(r.tvdb.episode);
    const absolute = Number(
      r.scene.absolute || r.anidb.absolute || r.tvdb.absolute,
    );
    if (
      Number.isFinite(s) && Number.isFinite(e) && Number.isFinite(absolute) &&
      s >= 0 && e > 0 && absolute > 0
    ) {
      const key = `${s}-${e}`;
      if (!map.has(key)) map.set(key, absolute); // first-wins
    }
  }
  return map;
};

import {
  buildTvdbAbsoluteMap,
  buildTvdbSeasonEpisodeToAbsoluteMap,
  getTheXemMappingsByTvdb,
} from '@scope/service/thexem';

export interface XemMaps {
  seasonMap: Map<string, number> | null; // key `${season}-${episode}` -> abs
  absMap: Map<number, number> | null; // existing abs -> canonical abs
}

export async function buildXemMaps(
  tvdbId?: number | null,
): Promise<XemMaps> {
  try {
    if (!tvdbId) {
      return { seasonMap: null, absMap: null };
    }
    const rows = await getTheXemMappingsByTvdb(tvdbId);
    return {
      seasonMap: buildTvdbSeasonEpisodeToAbsoluteMap(rows),
      absMap: buildTvdbAbsoluteMap(rows),
    };
  } catch (_) {
    return { seasonMap: null, absMap: null };
  }
}

export function remapEpisodeNumber(
  number: number | null | undefined,
  season: number | null | undefined,
  episode: number | null | undefined,
  maps: XemMaps,
): { number: number | null; remapped: boolean } {
  let result = number ?? null;
  let remapped = false;
  const s = season ?? undefined;
  const e = episode ?? undefined;
  if (s != null && e != null && maps.seasonMap) {
    const key = `${s}-${e}`;
    const mappedAbs = maps.seasonMap.get(key);
    if (typeof mappedAbs === 'number') {
      result = mappedAbs;
      remapped = true;
      return { number: result, remapped };
    }
  }
  if (number != null && maps.absMap) {
    const n = Number(number);
    if (Number.isFinite(n) && maps.absMap.has(n)) {
      result = maps.absMap.get(n)!;
      remapped = true;
    }
  }
  return { number: result, remapped };
}

import { assertEquals } from '@std/assert';
import {
  buildXemMaps,
  remapEpisodeNumber,
  type XemMaps,
} from '../../helpers/xem.ts';

Deno.test('remapEpisodeNumber uses season-episode map when available', () => {
  const maps: XemMaps = {
    seasonMap: new Map<string, number>([['1-1', 11], ['1-2', 12]]),
    absMap: null,
  };
  const a = remapEpisodeNumber(1, 1, 1, maps);
  const b = remapEpisodeNumber(2, 1, 2, maps);
  assertEquals(a, { number: 11, remapped: true });
  assertEquals(b, { number: 12, remapped: true });
});

Deno.test('remapEpisodeNumber falls back to absMap when season-episode missing', () => {
  const maps: XemMaps = {
    seasonMap: new Map<string, number>([['1-1', 11]]),
    absMap: new Map<number, number>([[2, 22]]),
  };
  const a = remapEpisodeNumber(2, 2, 1, maps); // no 2-1 key; fallback to absMap
  assertEquals(a, { number: 22, remapped: true });
});

Deno.test('buildXemMaps returns empty maps for invalid id', async () => {
  const maps = await buildXemMaps(0);
  assertEquals(maps.seasonMap, null);
  assertEquals(maps.absMap, null);
});

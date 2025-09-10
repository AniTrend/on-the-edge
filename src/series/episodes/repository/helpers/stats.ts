import type { MergedEpisode } from '../../aggregator/types.ts';
import { logger } from '../../../../common/core/logger.ts';

export function logMergeStats(
  merged: MergedEpisode[],
  flags: {
    titleSim: number | null;
  },
  xemRemapped: number,
) {
  try {
    const total = merged.length;
    const orphans = merged.filter((e) =>
      e.conflictReasons?.includes('ORPHAN')
    ).length;
    const conflicts = {
      TITLE: merged.filter((e) => e.conflictReasons?.includes('TITLE')).length,
      DURATION: merged.filter((e) =>
        e.conflictReasons?.includes('DURATION')
      ).length,
      AIR_DATE:
        merged.filter((e) => e.conflictReasons?.includes('AIR_DATE')).length,
    } as const;
    const srcCount = merged.reduce<Record<string, number>>((acc, e) => {
      for (const s of (e.sources ?? [])) acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    logger.debug('series.episodes.merge.stats', {
      total,
      orphans,
      conflicts,
      sources: srcCount,
      xemRemapped,
      flags,
    });
  } catch (_) {
    // ignore logging failures
  }
}

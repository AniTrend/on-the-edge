import type { EpisodeCollection } from '../../collection/episode.collection.ts';
import type { EpisodeDocument } from '../../store/types.ts';
import { getJikanAnime, JikanAnime } from '../../../service/jikan/index.ts';
import {
  currentDate,
  isOlderThan,
  toEpotch,
} from '../../../common/core/utils.ts';
import { EpisodeCanonical, toCanonicalEpisode } from '../../episodes.types.ts';
import { logger } from '../../../common/core/index.ts';
import { MergeResult } from '../../aggregator/types.ts';

export async function persist(
  collection: EpisodeCollection,
  seriesKey: string,
  airing: boolean,
  result: MergeResult,
): Promise<EpisodeDocument> {
  const document: EpisodeDocument = {
    seriesKey,
    airing: airing,
    updatedAt: toEpotch(currentDate()),
    ...result,
  };
  return await collection.save(document);
}

export async function fetchCanonical(
  seriesKey: string,
  malId: number,
): Promise<{ airing: boolean | null; episodes: EpisodeCanonical[] }> {
  const jikan: JikanAnime | undefined = await getJikanAnime(malId, {
    episodes: true,
    theme: true,
  });
  if (!jikan) {
    logger.error(
      `series.episode.repository.helpers.loader: Failed to fetch episodes for seriesKey=${seriesKey}, malId=${malId}`,
    );
    throw new Error(
      `Failed to fetch episodes for seriesKey=${seriesKey}, malId=${malId}`,
    );
  }
  const episodes =
    jikan.episodes_list?.map((episode) =>
      toCanonicalEpisode({ ...episode, themes: jikan.theme ?? null })
    ) ?? [];
  return { airing: jikan.airing ?? false, episodes };
}

export async function load(
  collection: EpisodeCollection,
  seriesKey: string,
): Promise<EpisodeDocument | undefined> {
  const document = await collection.get(seriesKey);
  if (document) {
    let refreshThreshold = 24 * 7; // 7 days
    if (document.airing === true) {
      refreshThreshold = 12; // 12 hours
    }
    if (!isOlderThan(currentDate(), document.updatedAt, refreshThreshold)) {
      return document;
    }
  }
  return undefined;
}

import type { EpisodeCanonical } from '../../episodes.types.ts';
import { getAniListRelationId } from '../../../service/arm/index.ts';
import type { SeriesRelationId } from '../../../service/arm/types.ts';
import { getSkyhookShow } from '../../../service/skyhook/index.ts';
import {
  buildTvdbAbsoluteMap,
  buildTvdbSeasonEpisodeToAbsoluteMap,
  getTheXemMappingsByTvdb,
} from '../../../service/thexem/index.ts';
import { getTraktSeasons } from '../../../service/trakt/remote/index.ts';
import { toCanonicalFromTrakt } from '../../../service/trakt/transformer/index.ts';
import EpisodeSeasonRepository from '../season.repository.ts';
import { getTmdbShow } from '../../../service/tmdb/index.ts';
import { provider } from '../../../service/tmdb/transformer/index.ts';
import { toInstant } from '../../../common/helpers/date.ts';
import { getNotifyAnime } from '../../../service/notify/notify.service.ts';
import { logger } from '../../../common/core/index.ts';

export type SourceSlice = {
  source: 'JIKAN' | 'SKYHOOK' | 'TRAKT';
  episodes: EpisodeCanonical[];
};

export async function getSkyhookSlice(
  malId: number,
  opts: { normalizeXem: boolean; relation?: SeriesRelationId },
): Promise<{ slice: SourceSlice | null; remapped: number }> {
  try {
    const rel = opts.relation ?? await getAniListRelationId(malId);
    const tvdb = rel?.thetvdb;
    if (!tvdb) return { slice: null, remapped: 0 };
    const sky = await getSkyhookShow(tvdb);
    if (!sky?.episodes?.length) return { slice: null, remapped: 0 };

    let seasonMap: Map<string, number> | null = null;
    let absMap: Map<number, number> | null = null;
    if (opts.normalizeXem) {
      try {
        const tvdbId = Number(tvdb);
        if (Number.isFinite(tvdbId) && tvdbId > 0) {
          const rows = await getTheXemMappingsByTvdb(tvdbId);
          seasonMap = buildTvdbSeasonEpisodeToAbsoluteMap(rows);
          absMap = buildTvdbAbsoluteMap(rows);
        }
      } catch (_) {
        // ignore
      }
    }

    let remappedCount = 0;
    const mapped: EpisodeCanonical[] = sky.episodes.map((ep) => {
      const id = ep.episodeNumber ?? ep.tvdbId;
      let number = ep.absoluteEpisodeNumber ?? ep.episodeNumber ?? ep.tvdbId;
      if (number == null) number = ep.tvdbId;
      const s = ep.seasonNumber;
      const e = ep.episodeNumber;
      if (seasonMap && s != null && e != null) {
        const key = `${s}-${e}`;
        const mappedAbs = seasonMap.get(key);
        if (typeof mappedAbs === 'number') {
          number = mappedAbs;
          remappedCount++;
        }
      } else if (absMap) {
        const n = Number(number);
        if (Number.isFinite(n) && absMap.has(n)) {
          number = absMap.get(n)!;
          remappedCount++;
        }
      }
      return {
        id,
        number,
        title: ep.title ?? null,
        titleJapanese: null,
        synopsis: ep.overview ?? null,
        filler: null,
        recap: ep.finaleType === 'season' ? true : null,
        aired: ep.airDateUtc
          ? toInstant(ep.airDateUtc)
          : (ep.airDate ? toInstant(ep.airDate) : null),
        score: null,
        kind: (ep.airedBeforeSeasonNumber || ep.airedAfterSeasonNumber)
          ? 'special'
          : 'main',
        duration: typeof ep.runtime === 'number' ? ep.runtime : null,
        url: null,
        tvdbShowId: sky.tvdbId ?? null,
        tvdbId: ep.tvdbId ?? null,
        tmdbId: opts.relation?.themoviedb,
        seasonNumber: ep.seasonNumber ?? null,
        episodeNumber: ep.episodeNumber ?? null,
        absoluteEpisodeNumber: ep.absoluteEpisodeNumber ?? null,
        airedBeforeSeasonNumber: ep.airedBeforeSeasonNumber ?? null,
        airedBeforeEpisodeNumber: ep.airedBeforeEpisodeNumber ?? null,
        airedAfterSeasonNumber: ep.airedAfterSeasonNumber ?? null,
        airedAfterEpisodeNumber: ep.airedAfterEpisodeNumber ?? null,
        image: ep.image ?? null,
        poster: null,
        themes: { openings: [], endings: [] }, // SKYHOOK has no theme data
      } as EpisodeCanonical;
    });
    return {
      slice: { source: 'SKYHOOK', episodes: mapped },
      remapped: remappedCount,
    };
  } catch (_) {
    return { slice: null, remapped: 0 };
  }
}

export async function getTraktSlice(
  relation?: SeriesRelationId,
): Promise<SourceSlice | null> {
  try {
    const id = relation?.imdb ?? relation?.animePlanet;
    if (!id) return null;

    const seasons = await getTraktSeasons(id, { includeEpisodes: true });
    const episodes: EpisodeCanonical[] = seasons.flatMap((s) =>
      s.episodes?.map(toCanonicalFromTrakt) ?? []
    );
    return episodes.length ? { source: 'TRAKT', episodes } : null;
  } catch (_) {
    return null;
  }
}

/**
 * DEPRECATED: getSeasonSlice
 * Use helpers under src/series/episodes/helpers to build provider slices and orchestrate merge.
 */
export async function getSeasonSlice(
  canonicalEpisodes: EpisodeCanonical[],
  opts: { normalizeXem: boolean; relation?: SeriesRelationId },
): Promise<SourceSlice | null> {
  const { relation } = opts;
  try {
    const tvdb = relation?.thetvdb;
    const tmdbId = relation?.themoviedb;
    if (!tvdb || !tmdbId) return null;

    const [skyhook, tmdb, notify] = await Promise.all([
      getSkyhookShow(tvdb),
      getTmdbShow(tmdbId),
      getNotifyAnime(relation?.notify),
    ]);
    if (!skyhook || !tmdb) return null;

    logger.debug(
      'series.episodes.repository.helpers.sources:getSeasonSlice: Filtering cnonical episodes',
    );
    const canonicalMeta = canonicalEpisodes.map((episode) => ({
      title: episode.title?.english,
      aired: episode.aired,
    }));
    // Limit skyhook episodes to those present in canonicalEpisodes, matching title and air date
    const episodesMatch = skyhook.episodes.filter((episode) => {
      return canonicalMeta.some((meta) =>
        meta.title === episode.title &&
        meta.aired === toInstant(episode.airDate)
      );
    });

    const filterCriteria = episodesMatch.map((episode) => ({
      season: episode.seasonNumber,
      episode: episode.episodeNumber,
    }));
    logger.info(
      'series.episodes.repository.helpers.sources:getSeasonSlice: Matched on seasons',
      filterCriteria,
    );

    const seasonRepository = new EpisodeSeasonRepository(filterCriteria);
    const seasons = await seasonRepository.getSeasons(notify, skyhook, tmdb);
    const episodes = seasons.flatMap((season) => season.episodes ?? []);
    if (!episodes.length) return null;

    const mapped: EpisodeCanonical[] = episodes.map((episode) => {
      // Build canonical fields preferring absolute/season-episode numbering
      const id = episode.episodeNumber ?? episode.tvdbId;
      let number: number | null = episode.absoluteEpisodeNumber ??
        episode.episodeNumber ?? episode.tvdbId ?? null;
      if (number == null && typeof episode.tvdbId === 'number') {
        number = episode.tvdbId;
      }

      return {
        id: id!,
        number,
        title: episode.title ?? null,
        synopsis: episode.overview ?? null,
        aired: episode.airDateUtc
          ? toInstant(episode.airDateUtc)
          : (episode.airDate ? toInstant(episode.airDate) : null),
        score: null,
        kind: episode.finaleType === 'season'
          ? 'recap'
          : (episode.airedBeforeSeasonNumber || episode.airedAfterSeasonNumber)
          ? 'special'
          : 'main',
        duration: typeof episode.runtime === 'number' ? episode.runtime : null,
        url: null,
        tvdbShowId: episode.tvdbShowId ?? null,
        tvdbId: episode.tvdbId ?? null,
        tmdbId: episode.id ?? null,
        seasonNumber: episode.seasonNumber ?? null,
        episodeNumber: episode.episodeNumber ?? null,
        absoluteEpisodeNumber: episode.absoluteEpisodeNumber ?? null,
        airedBeforeSeasonNumber: episode.airedBeforeSeasonNumber ?? null,
        airedBeforeEpisodeNumber: episode.airedBeforeEpisodeNumber ?? null,
        airedAfterSeasonNumber: episode.airedAfterSeasonNumber ?? null,
        airedAfterEpisodeNumber: episode.airedAfterEpisodeNumber ?? null,
        image: episode.image,
        poster: provider.getImageUrl('original', episode.stillPath),
      } as EpisodeCanonical;
    });

    return { source: 'SKYHOOK', episodes: mapped };
  } catch (error) {
    logger.error(
      'series.episodes.repository.helpers.sources:getSeasonSlice: Error in getSeasonSlice:',
      error,
    );
    return null;
  }
}

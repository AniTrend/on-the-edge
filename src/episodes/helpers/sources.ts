import type { EpisodeCanonical } from '../episodes.types.ts';
import type { SeriesRelationId } from '../../service/arm/types.ts';
import { toInstant } from '../../common/helpers/date.ts';
import { logger } from '../../common/core/logger.ts';
import { getTmdbSeason, getTmdbShow } from '../../service/tmdb/index.ts';
import { provider as tmdbProvider } from '../../service/tmdb/transformer/index.ts';
import { getNotifyAnime } from '../../service/notify/notify.service.ts';
import type { SkyhookShow } from '../../service/skyhook/types.ts';
import type { TmdbShow } from '../../service/tmdb/types.ts';
import type { SeasonEpisodePair } from './scope.ts';
import { buildXemMaps, remapEpisodeNumber } from './xem.ts';

export type SourceSlice = {
  source: 'JIKAN' | 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'NOTIFY' | 'THEMES';
  episodes: EpisodeCanonical[];
};

export async function getSkyhookSliceAlignedToScope(
  opts: {
    relation: SeriesRelationId;
    skyhookShow?: SkyhookShow;
    scopePairs: SeasonEpisodePair[];
    normalizeXem?: boolean;
  },
): Promise<
  { slice: SourceSlice | null; remapped: number; skyhook?: SkyhookShow }
> {
  try {
    const tvdb = opts.relation?.thetvdb;
    if (!tvdb) return { slice: null, remapped: 0 };
    if (!opts.skyhookShow?.episodes?.length) {
      return { slice: null, remapped: 0 };
    }

    const scopeSet = new Set(
      opts.scopePairs.map((p) => `${p.season}-${p.episode}`),
    );
    const maps = opts.normalizeXem
      ? await buildXemMaps(opts.skyhookShow?.tvdbId ?? tvdb)
      : { seasonMap: null, absMap: null };
    let remappedCount = 0;
    const mapped: EpisodeCanonical[] = opts.skyhookShow?.episodes
      .filter((e) => scopeSet.has(`${e.seasonNumber}-${e.episodeNumber}`))
      .map((ep) => {
        const id = ep.episodeNumber ?? ep.tvdbId;
        const numInit = ep.absoluteEpisodeNumber ?? ep.episodeNumber ??
          ep.tvdbId ?? null;
        const { number, remapped } = remapEpisodeNumber(
          numInit,
          ep.seasonNumber ?? null,
          ep.episodeNumber ?? null,
          maps,
        );
        if (remapped) remappedCount++;
        return {
          id: id!,
          number,
          title: ep.title
            ? { english: ep.title, native: null, romanji: ep.title }
            : null,
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
          tvdbShowId: opts.skyhookShow?.tvdbId ?? null,
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
          themes: { openings: [], endings: [] },
        } as EpisodeCanonical;
      });

    return {
      slice: mapped.length ? { source: 'SKYHOOK', episodes: mapped } : null,
      remapped: remappedCount,
      skyhook: opts.skyhookShow,
    };
  } catch (e) {
    logger.warn('helpers.sources.getSkyhookSliceAlignedToScope error', e);
    return { slice: null, remapped: 0 };
  }
}

export async function getTmdbSliceForScope(
  opts: {
    relation?: SeriesRelationId;
    scopePairs: SeasonEpisodePair[];
    skyhookShow?: SkyhookShow | null;
  },
): Promise<SourceSlice | null> {
  try {
    const tmdbId = opts.relation?.themoviedb;
    if (!tmdbId) return null;
    const tmdb = await getTmdbShow(tmdbId);
    if (!tmdb || !tmdb.seasons?.length) return null;
    const scopeSeasons = [...new Set(opts.scopePairs.map((p) => p.season))];
    const seasonPromises = scopeSeasons.flatMap((s) =>
      getTmdbSeason(s, tmdb.id)
    );
    const seasons = (await Promise.all(seasonPromises)).filter((
      s,
    ): s is NonNullable<typeof s> => Boolean(s));
    const seasonEpSet = new Set(
      opts.scopePairs.map((p) => `${p.season}-${p.episode}`),
    );
    const episodes: EpisodeCanonical[] = [];
    for (const season of seasons) {
      const eps = season.episodes ?? [];
      for (const ep of eps) {
        if (!seasonEpSet.has(`${season.season_number}-${ep.episode_number}`)) {
          continue;
        }
        episodes.push({
          id: ep.id,
          number: null, // do not overwrite canonical numbering
          title: ep.name
            ? { english: ep.name, native: null, romanji: ep.name }
            : null,
          synopsis: ep.overview ?? null,
          aired: ep.air_date ? toInstant(ep.air_date) : null,
          score: ep.vote_average ?? null,
          kind: null,
          duration: ep.runtime ?? null,
          url: null,
          tvdbShowId: null,
          tvdbId: null,
          tmdbId: ep.id,
          seasonNumber: season.season_number,
          episodeNumber: ep.episode_number,
          absoluteEpisodeNumber: null,
          airedBeforeSeasonNumber: null,
          airedBeforeEpisodeNumber: null,
          airedAfterSeasonNumber: null,
          airedAfterEpisodeNumber: null,
          image: null,
          poster: tmdbProvider.getImageUrl('original', ep.still_path) ?? null,
          themes: { openings: [], endings: [] },
        });
      }
    }
    return episodes.length ? { source: 'TMDB', episodes } : null;
  } catch (e) {
    logger.warn('helpers.sources.getTmdbSliceForScope error', e);
    return null;
  }
}

// Fallback: align TMDB directly to canonical episodes when Skyhook scope is unavailable
export async function getTmdbSliceByCanonical(
  opts: {
    relation?: SeriesRelationId;
    canonical: EpisodeCanonical[];
  },
): Promise<SourceSlice | null> {
  try {
    const tmdbId = opts.relation?.themoviedb;
    if (!tmdbId) return null;
    const tmdb = (await getTmdbShow(tmdbId).catch(() => undefined)) as
      | TmdbShow
      | undefined;
    if (!tmdb || !tmdb.seasons?.length) return null;

    // Build canonical matching metadata
    const norm = (s?: string | null) =>
      (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const canon = opts.canonical.map((e) => ({
      title: norm(e.title?.romanji ?? e.title?.english ?? e.title?.native),
      aired: e.aired,
    }));
    const withinDay = (a?: number | null, b?: number | null) => {
      if (a == null || b == null) return false;
      const day = (x: number) => Math.floor((x * 1000) / 86400000);
      return Math.abs(day(a) - day(b)) <= 1;
    };

    // Fetch all seasons; align episodes by normalized title or near air-date
    const seasons = (await Promise.all(
      (tmdb.seasons ?? []).map((s) => getTmdbSeason(s.season_number, tmdb.id)),
    )).filter((s): s is NonNullable<typeof s> => Boolean(s));

    const episodes: EpisodeCanonical[] = [];
    for (const season of seasons) {
      for (const ep of season.episodes ?? []) {
        const tmTitle = norm(ep.name);
        const tmAired = ep.air_date ? toInstant(ep.air_date) : null;
        const matched = canon.some((m) =>
          (tmTitle && m.title === tmTitle) || withinDay(m.aired, tmAired)
        );
        if (!matched) continue;
        episodes.push({
          id: ep.id,
          number: null,
          title: ep.name
            ? { english: ep.name, native: null, romanji: ep.name }
            : null,
          synopsis: ep.overview ?? null,
          aired: tmAired,
          score: null,
          kind: null,
          duration: ep.runtime ?? null,
          url: null,
          tvdbShowId: null,
          tvdbId: null,
          tmdbId: ep.id,
          seasonNumber: season.season_number,
          episodeNumber: ep.episode_number,
          absoluteEpisodeNumber: null,
          airedBeforeSeasonNumber: null,
          airedBeforeEpisodeNumber: null,
          airedAfterSeasonNumber: null,
          airedAfterEpisodeNumber: null,
          image: null,
          poster: tmdbProvider.getImageUrl('original', ep.still_path) ?? null,
          themes: { openings: [], endings: [] },
        });
      }
    }
    return episodes.length ? { source: 'TMDB', episodes } : null;
  } catch (e) {
    logger.warn('helpers.sources.getTmdbSliceByCanonical error', e);
    return null;
  }
}

// Align Notify episodes to canonical by title/near air-date; provides NOTIFY as a distinct source
export async function getNotifyEpisodeSliceByCanonical(
  opts: { relation: SeriesRelationId; canonical: EpisodeCanonical[] },
): Promise<SourceSlice | null> {
  try {
    const notifyId = opts.relation.notify;
    if (!notifyId) return null;
    const anime = await getNotifyAnime(notifyId, { withEpisodes: true });
    if (!anime?.episodes?.length) return null;

    const norm = (s?: string | null) =>
      (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const withinDay = (a?: number | null, b?: number | null) => {
      if (a == null || b == null) return false;
      const day = (x: number) => Math.floor((x * 1000) / 86400000);
      return Math.abs(day(a) - day(b)) <= 1;
    };
    const canon = opts.canonical.map((e) => ({
      t: norm(e.title?.romanji ?? e.title?.english ?? e.title?.native),
      a: e.aired,
    }));

    const episodes: EpisodeCanonical[] = [];
    for (const ep of anime.episodes) {
      const t = norm(ep.title);
      const a = ep.startAirDate ?? ep.endAirDate ?? null;
      const matched = canon.some((m) => (t && m.t === t) || withinDay(m.a, a));
      if (!matched) continue;
      episodes.push({
        id: Number(ep.id) || ep.number,
        number: null,
        title: ep.title
          ? { english: ep.title, romanji: ep.title, native: null }
          : null,
        synopsis: null,
        aired: a,
        score: null,
        kind: null,
        duration: null,
        url: null,
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
        themes: { openings: [], endings: [] },
      });
    }

    return episodes.length ? { source: 'NOTIFY', episodes } : null;
  } catch (e) {
    logger.warn('helpers.sources.getNotifyEpisodeSliceByCanonical error', e);
    return null;
  }
}

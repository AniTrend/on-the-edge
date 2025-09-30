import type { EpisodeCanonical } from '../../episodes.types.ts';
import {
  getAniListRelationId,
  type SeriesRelationId,
} from '@scope/service/arm';
import { getTmdbSeason, provider } from '@scope/service/tmdb';

export async function enrichWithTmdbRuntimes(
  episodes: EpisodeCanonical[],
  relation?: SeriesRelationId,
): Promise<EpisodeCanonical[]> {
  try {
    const tmdb = relation?.themoviedb;
    if (!tmdb) return episodes;
    const season = await getTmdbSeason(1, tmdb);
    const eps = season?.episodes ?? [];
    if (!eps || !eps.length) return episodes;
    const runtimeByNum = new Map<number, number>();
    for (const ep of eps) {
      const num = Number(
        (ep as unknown as { episode_number: number | string }).episode_number,
      );
      const rt = (ep as unknown as { runtime?: number }).runtime;
      if (Number.isFinite(num) && typeof rt === 'number' && rt > 0) {
        runtimeByNum.set(num, rt);
      }
    }
    return episodes.map((e) => {
      const num = e.number ?? e.id;
      if (e.duration == null && runtimeByNum.has(num)) {
        return { ...e, duration: runtimeByNum.get(num)! };
      }
      return e;
    });
  } catch (_) {
    return episodes; // best-effort enrichment
  }
}

export async function enrichWithTmdbImages(
  malId: number,
  episodes: EpisodeCanonical[],
  relation?: SeriesRelationId,
): Promise<EpisodeCanonical[]> {
  try {
    const rel = relation ?? await getAniListRelationId(malId);
    const tmdb = rel?.themoviedb;
    if (!tmdb) return episodes;

    const season = await getTmdbSeason(1, tmdb);
    // Use shared TMDB image provider to avoid fetching config
    const posterSize = 'w300';
    const stillSize = 'w300';

    const seasonPosterPath = season?.images?.posters?.[0]?.file_path ||
      season?.poster_path || null;

    const epMap = new Map<
      number,
      { still_path?: string | null; id?: number }
    >();
    const eps = season?.episodes ?? [];
    for (const ep of eps) {
      const num = Number(
        (ep as unknown as { episode_number: number | string }).episode_number,
      );
      if (Number.isFinite(num)) {
        epMap.set(num, {
          still_path:
            (ep as unknown as { still_path?: string | null }).still_path ??
              null,
          id: (ep as unknown as { id?: number }).id,
        });
      }
    }

    return episodes.map((e) => {
      const epNum = typeof e.episodeNumber === 'number'
        ? e.episodeNumber
        : (e.number ?? undefined);
      let image = e.image;
      let poster = e.poster;
      let tmdbId = e.tmdbId;

      if (!image && epNum != null) {
        const t = epMap.get(Number(epNum));
        if (t?.still_path) {
          // Prefer provider with fixed size
          image = provider.getImageUrl(stillSize, t.still_path) ?? null;
        }
        if (!tmdbId && typeof t?.id === 'number') tmdbId = t.id;
      }
      if (!poster && seasonPosterPath) {
        // Build poster sizes via provider
        poster = provider.getImageUrl(posterSize, seasonPosterPath) ?? null;
      }

      return (image !== e.image || poster !== e.poster || tmdbId !== e.tmdbId)
        ? { ...e, image, poster, tmdbId }
        : e;
    });
  } catch (_) {
    return episodes; // best-effort enrichment
  }
}

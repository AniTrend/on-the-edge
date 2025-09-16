import { EpisodeCanonical } from '../../../episodes/episodes.types.ts';
import { toInstant } from '../../../common/helpers/date.ts';
import { EpisodeModel } from '../remote/types.ts';

const episodeKind = (model: EpisodeModel): 'main' | 'filler' | 'recap' => {
  // Trakt does not provide explicit kind, so we derive based on available flags
  if (model.after_credits || model.during_credits) {
    return 'recap';
  }
  // No explicit filler flag, assume main for standard episodes
  return 'main';
};

export const toCanonicalFromTrakt = (
  model: EpisodeModel,
): EpisodeCanonical => ({
  id: model.ids.trakt,
  number: model.number ?? null,
  title: {
    english: model.title ?? null,
    romanji: null,
    native: model.original_title ?? null,
  },
  synopsis: model.overview ?? null,
  aired: model.first_aired ? toInstant(model.first_aired) : null,
  score: model.rating ?? null,
  kind: episodeKind(model),
  duration: model.runtime ?? null,
  url: null,
  tvdbShowId: null,
  tvdbId: model.ids.tvdb ?? null,
  tmdbId: model.ids.tmdb ?? null,
  seasonNumber: model.season ?? null,
  episodeNumber: model.number ?? null,
  absoluteEpisodeNumber: model.number_abs ?? null,
  airedBeforeSeasonNumber: null,
  airedBeforeEpisodeNumber: null,
  airedAfterSeasonNumber: null,
  airedAfterEpisodeNumber: null,
  image: null,
  poster: null,
  themes: { openings: [], endings: [] },
});

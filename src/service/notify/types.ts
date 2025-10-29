import type {
  NotifyAnimeRemote,
  NotifyEpisodeRemote,
} from './notify.schema.ts';
import type { Anime, TransformedEpisode } from './transformer/types.ts';

export type NotifyAnime = Anime;
export type NotifyEpisode = TransformedEpisode;
export type EnrichedAnimeData = Omit<NotifyAnimeRemote, 'episodes'> & {
  episodes: NotifyEpisodeRemote[];
};
export type { NotifyAnimeRemote, NotifyEpisodeRemote };

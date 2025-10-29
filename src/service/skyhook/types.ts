import type {
  SkyhookRemoteEpisode,
  SkyhookRemoteShow,
} from './skyhook.schema.ts';

export type SkyhookEpisode = SkyhookRemoteEpisode;

export type SkyhookSeason = Pick<SkyhookRemoteShow, 'seasons'>;

export type SkyhookShow = Omit<SkyhookRemoteShow, 'images'>;

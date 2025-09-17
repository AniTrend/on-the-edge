import { EpisodeModel, SkyhookModel } from './remote/types.ts';
import { Show } from './transformer/types.ts';

export type SkyhookEpisode = EpisodeModel;

export type SkyhookShow =
  & Omit<SkyhookModel, 'firstAired' | 'lastUpdated'>
  & Show;

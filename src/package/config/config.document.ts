import { Config } from './config.types.ts';
import { WithId } from 'mongodb';

/** Raw MongoDB navigation item — key is optional because the transformer
 * generates it from destination when absent in the persisted document.
 * rank and group.rank are ordering fields stripped before the response. */
export type NavigationItemInput =
  & Omit<Config['navigation'][number], 'key' | 'group'>
  & {
    key?: string | null;
    rank?: number;
    group: Config['navigation'][number]['group'] & {
      rank?: number;
    };
  };

export type ConfigDocument =
  & WithId<
    Omit<Config, 'id' | 'settings' | 'navigation'>
  >
  & {
    navigation: NavigationItemInput[];
  };

import { Config } from './config.types.ts';
import { WithId } from 'mongodb';

/** Raw MongoDB navigation item — key is optional because the transformer
 * generates it from destination when absent in the persisted document. */
type NavigationItemInput = Omit<Config['navigation'][number], 'key'> & {
  key?: string | null;
};

export type ConfigDocument =
  & WithId<
    Omit<Config, 'id' | 'settings' | 'navigation'>
  >
  & {
    navigation: NavigationItemInput[];
  };

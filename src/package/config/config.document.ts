import { Config } from './config.types.ts';
import { WithId } from 'mongodb';

export type ConfigDocument = Omit<WithId<Config>, 'id' | 'settings'>;

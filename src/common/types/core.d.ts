import { Context } from 'x/oak';
import { State } from './state.d.ts';
import { GrowthBook } from 'esm/growthbook';
import { Db } from 'npm/mongodb';
import { AppFeatures } from '../experiment/types.d.ts';

export type RCF822Date = string;

export type Error = {
  message: string;
};

export type AppContext = Context<State>;

export type Features = GrowthBook<AppFeatures>;

export type Local = Db | undefined;

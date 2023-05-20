import { Context } from 'x/oak';
import { State } from './state.d.ts';
import { Database } from './supabase.d.ts';
import { SupabaseClient } from 'esm/supabase';
import { GrowthBook } from 'esm/growthbook';
import { AppFeatures } from '../experiment/types.d.ts';

export type RCF822Date = string;

export type Error = {
  message: string;
};

export type AppContext = Context<State>;

export type Client = SupabaseClient<Database>;

export type Growth = GrowthBook<AppFeatures>;

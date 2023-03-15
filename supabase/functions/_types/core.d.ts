import { Context } from "x/oak";
import { State } from "./state.ts";
import { Database } from "./supabase.d.ts";
import { SupabaseClient } from "esm/supabase";

export type RCF822Date = string | undefined;

export type Optional<T> = T | undefined | null;

export type Error = {
  message: string;
};

export type AppContext = Context<State>;

export type Client = SupabaseClient<Database>;

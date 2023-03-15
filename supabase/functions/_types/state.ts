import { Logger } from "std/log";
import { SupabaseClient } from "esm/supabase";
import { Database } from "./supabase.d.ts";

export type LimiterOptions = {
  window: number;
  limit: number;
};

export type Credential = {
  id?: string;
  key?: string;
};

export type Config = {
  url: string;
  headers: string[];
};

export type Environment = {
  config: {
    feed: Config;
    yuna: Config;
    xem: Config;
    themes: Config;
    mal: Config;
    notify: Config;
  };
  service: {
    supabase: Credential;
    tmdb: Credential;
    trakt: Credential;
  };
  limitter: LimiterOptions;
  namespace: string;
};

export interface State {
  client: SupabaseClient<Database>;
  envrionment: Environment;
  logger: Logger;
}

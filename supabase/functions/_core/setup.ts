import { createClient } from "esm/supabase";
import { Database } from "../_types/supabase.d.ts";
import { State } from "../_types/state.ts";
import { env } from "./env.ts";
import logger from "../_core/logger.ts";

export default <State> {
  client: createClient<Database>(
    `https://${env("SUPABASE_ID", "")}.supabase.co`,
    env("SUPABASE_API_KEY", ""),
  ),
  envrionment: {
    config: {
      feed: {
        headers: [],
        url: env("FEED", ""),
      },
      yuna: {
        headers: [],
        url: env("YUNA", ""),
      },
      xem: {
        headers: [],
        url: env("XEM", ""),
      },
      themes: {
        headers: [],
        url: env("THEMES", ""),
      },
      mal: {
        headers: [],
        url: env("MAL", ""),
      },
      notify: {
        headers: [],
        url: env("NOTIFY", ""),
      },
    },
    service: {
      supabase: {
        id: env("SUPABASE_ID", ""),
        key: env("SUPABASE_API_KEY", ""),
      },
      tmdb: {
        id: env("TMDB_ID", ""),
        key: env("TMDB_KEY", ""),
      },
      trakt: {
        id: env("TRAKT_ID", ""),
        key: env("TRAKT_KEY", ""),
      },
    },
    limitter: {
      window: env("RATE_LIMIT_WINDOW", 1000 * 60),
      limit: env("RATE_LIMIT_REQUESTS", 30),
    },
    namespace: env("NAMESPACE", ""),
  },
  logger: logger(env("LOGGER_NAME", "prod")),
};

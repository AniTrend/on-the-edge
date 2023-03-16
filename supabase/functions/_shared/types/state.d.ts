import { Client, Growth } from './core.d.ts';

export type ContextHeader = {
  agent: string;
  accepts: string[];
  authorization: string | null;
  contentType: string | null;
  acceptEncoding: string;
  forwarded: string;
  language: string;
};

export type LimiterOptions = {
  window: number;
  limit: number;
};

export type Credential = {
  id?: string;
  key?: string;
};

export type Service = {
  url: string;
  credential: Credential;
};

export type Environment = {
  limitter: LimiterOptions;
  namespace: string;
};

export interface State {
  credential: {
    supabase: Credential;
  };
  contextHeader: ContextHeader;
  service: {
    feed: Service;
    yuna: Service;
    themes: Service;
    mal: Service;
    notify: Service;
    skyhook: Service;
    tmdb: Service;
    trakt: Service;
  };
  supabase: Client;
  growth: Growth;
  envrionment: Environment;
}

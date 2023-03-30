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

export type Credential = {
  id?: string;
  key?: string;
};

export type Service = {
  url: string;
  credential: Credential;
};

export type Environment = {
  namespace: string;
};

export interface State {
  credential: {
    supabase: Credential;
  };
  contextHeader: ContextHeader;
  supabase: Client;
  growth: Growth;
  envrionment: Environment;
}

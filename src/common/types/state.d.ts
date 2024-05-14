import { Features, Local } from './core.d.ts';

export type ContextHeader = {
  agent: string;
  accepts: string[];
  authorization: string | null;
  contentType: string | null;
  acceptEncoding: string;
  application?: {
    locale: string | null;
    version: string | null;
    source: string | null;
    code: string | null;
    label: string | null;
    buildType: string | null;
  };
};

export type Credential = {
  id?: string;
  key?: string;
};

export type Service = {
  url: string;
  credential: Credential;
};

export interface State {
  credential: {
    supabase: Credential;
  };
  contextHeader: ContextHeader;
  features: Features;
  local: Local;
}

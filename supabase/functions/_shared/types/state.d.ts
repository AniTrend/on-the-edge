import { IBrowser, ICPU, IDevice, IEngine, IOS } from 'esm/ua-agent-parser';
import { Client, Growth } from './core.d.ts';

export type ContextHeader = {
  agent: string;
  accepts: string[];
  authorization: string | null;
  contentType: string | null;
  acceptEncoding: string;
  forwarded: string | null;
  language: string;
  device?: {
    browser: IBrowser;
    cpu: ICPU;
    device: IDevice;
    engine: IEngine;
    os: IOS;
  };
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

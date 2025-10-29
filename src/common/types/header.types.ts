export type RequestAttributes = {
  authorization: string | null;
  accepts: string;
  agent: string;
  contentType: string | null;
  acceptEncoding: string;
};

export type ClientAttributes = {
  locale: string;
  version: string;
  source: string;
  code: string;
  label: string;
  build: string;
  platform: {
    browserName: string | null;
    browserVersion: string | null;
    cpuArchitecture: string | null;
    deviceModel: string | null;
    deviceVendor: string | null;
    deviceType: string | null;
    engineName: string | null;
    engineVersion: string | null;
    osName: string | null;
    osVersion: string | null;
  };
};

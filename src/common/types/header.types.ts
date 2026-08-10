/**
 * Request and client attributes derived from HTTP headers.
 *
 * Trust boundary: these headers are client-supplied targeting metadata, not
 * authentication. Any HTTP client can spoof them, so they must never be used
 * to authorize privileged operations.
 */
export type RequestAttributes = {
  authorization: string | null;
  accepts: string;
  agent: string;
  contentType: string | null;
  acceptEncoding: string;
};

/** Machine-readable product identity of the requesting application. */
export const UpdateProduct = {
  ANITREND_APP: 'ANITREND_APP',
  ANITREND_V2: 'ANITREND_V2',
} as const;

export type UpdateProduct = (typeof UpdateProduct)[keyof typeof UpdateProduct];

/** Canonical client headers sent by the AniTrend mobile clients. */
export const ClientHeader = {
  appId: 'x-app-id',
  package: 'x-app-package',
  version: 'x-app-version',
  versionCode: 'x-app-code',
  source: 'x-app-source',
  locale: 'x-app-locale',
  buildType: 'x-app-build-type',
  deviceBuildId: 'x-device-build-id',
} as const;

/**
 * Canonical, validated representation of the requesting application, derived
 * from client-supplied headers by HeaderMiddleware.
 *
 * Trust boundary: these are targeting metadata only, never authentication.
 * Do not use these attributes to authorize privileged operations.
 */
export type ClientContext = {
  appId: UpdateProduct;
  packageName: string;
  version: string;
  versionCode: number;
  buildType: string;
  source: string;
  locale: string;
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
    deviceBuildId: string | null;
  };
};

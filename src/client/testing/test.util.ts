import type { MockResponseOptions } from '@c4spar/mock-fetch';

function makeResponse(
  body: BodyInit | null,
  contentType: string,
  init: MockResponseOptions = {},
): MockResponseOptions {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('content-type')) headers.set('content-type', contentType);
  return { ...init, headers, body };
}

export function json(
  body: unknown,
  init: MockResponseOptions = {},
): MockResponseOptions {
  return makeResponse(JSON.stringify(body), 'application/json', init);
}

export function text(
  body: string,
  init: MockResponseOptions = {},
): MockResponseOptions {
  return makeResponse(body, 'text/plain', init);
}

export function bytes(
  body: BodyInit,
  init: MockResponseOptions = {},
): MockResponseOptions {
  return makeResponse(body, 'application/octet-stream', init);
}

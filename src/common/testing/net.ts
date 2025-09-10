import { stub } from '@std/testing/mock';

export type FetchRoute = {
  when: (url: string, init?: RequestInit) => boolean;
  respond: (url: string, init?: RequestInit) => Response | Promise<Response>;
};

export function json(
  data: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function startsWith(base: string) {
  return (url: string) => url.startsWith(base);
}

export function stubFetch(
  routes: FetchRoute[],
  fallback?: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const s = stub(
    globalThis,
    'fetch',
    (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
      for (const r of routes) {
        try {
          if (r.when(url, init)) return Promise.resolve(r.respond(url, init));
        } catch (_err) {
          // ignore route predicate errors and continue
        }
      }
      if (fallback) return Promise.resolve(fallback(url, init));
      return Promise.resolve(json([]));
    },
  );
  return { restore: () => s.restore() };
}

// --- Extras: method-aware routes and path params helpers ---

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (typeof input !== 'string' && !(input instanceof URL)) {
    const req = input as Request;
    if (req && typeof req.method === 'string') return req.method.toUpperCase();
  }
  const m = init?.method ?? 'GET';
  return m.toUpperCase();
}

type PathMatch = { ok: boolean; params: Record<string, string> };

function compilePath(pattern: string): (url: string) => PathMatch {
  const hasOrigin = /^https?:\/\//.test(pattern);
  let originHost: string | null = null;
  let pathPattern = pattern;
  if (hasOrigin) {
    const u = new URL(pattern);
    originHost = u.origin;
    pathPattern = u.pathname;
  }
  const keys: string[] = [];
  const regex = new RegExp(
    '^' + pathPattern
      .replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
      .replace(/:(\w+)/g, (_m, key) => {
        keys.push(key);
        return '([^/]+)';
      }) +
      '$',
  );
  return (rawUrl: string): PathMatch => {
    const u = new URL(rawUrl);
    if (originHost && u.origin !== originHost) return { ok: false, params: {} };
    const m = u.pathname.match(regex);
    if (!m) return { ok: false, params: {} };
    const params: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      params[keys[i]] = decodeURIComponent(m[i + 1]);
    }
    return { ok: true, params };
  };
}

type ParamResponder = (
  args: { params: Record<string, string>; url: string; init?: RequestInit },
) => Response | Promise<Response>;

function onMethod(
  method: string,
  pattern: string,
  handler: ParamResponder,
): FetchRoute {
  const matchPath = compilePath(pattern);
  return {
    when: (url: string, init?: RequestInit) =>
      getMethod(url as unknown as Request, init) === method.toUpperCase() &&
      matchPath(url).ok,
    respond: (url: string, init?: RequestInit) =>
      handler({ params: matchPath(url).params, url, init }),
  };
}

export function onGet(pattern: string, handler: ParamResponder): FetchRoute {
  return onMethod('GET', pattern, handler);
}

export function onPost(pattern: string, handler: ParamResponder): FetchRoute {
  return onMethod('POST', pattern, handler);
}

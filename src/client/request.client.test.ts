import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { RequestClient } from './request.client.ts';
import { bytes, json, text } from './testing/test.util.ts';

describe('RequestClient', () => {
  beforeEach(() => resetFetch());
  afterEach(() => resetFetch());

  it('builds URL with baseURL and query params', async () => {
    mockFetch(
      'https://api.example.com/users?page=1&size=20',
      json({ ok: true }),
    );
    const api = new RequestClient({ baseURL: 'https://api.example.com/v1' });
    const { data } = await api.request('/users').query({ page: 1, size: 20 })
      .send<{ ok: boolean }>();
    assertEquals(data?.ok, true);
  });

  it('merges headers: instance then request overrides', async () => {
    mockFetch(
      {
        url: 'https://x/echo-headers',
        headers: {
          'x-a': '1',
          'x-b': 'override',
          'x-c': '3',
        },
      },
      json({
        a: '1',
        b: 'override',
        c: '3',
      }),
    );

    const api = new RequestClient({ headers: { 'x-a': '1', 'x-b': '2' } });
    const { data } = await api
      .request('https://x/echo-headers')
      .header('x-b', 'override')
      .header('x-c', '3')
      .send<{ a: string | null; b: string | null; c: string | null }>();

    assertEquals(data, { a: '1', b: 'override', c: '3' });
  });

  it('auto parses json/text/bytes', async () => {
    mockFetch('https://x/json', json({ a: 1 }));
    mockFetch('https://x/text', text('hello'));
    mockFetch('https://x/bytes', bytes(new Uint8Array([1, 2, 3])));

    const api = new RequestClient();
    const jres = await api.request('https://x/json').send<{ a: number }>();
    assertEquals(jres.data?.a, 1);

    const tres = await api.request('https://x/text').send<string>();
    assertEquals(tres.data, 'hello');

    const bres = await api.request('https://x/bytes').send<Uint8Array>();
    assertEquals(Array.from(bres.data ?? new Uint8Array()), [1, 2, 3]);
  });

  it('throws on non-2xx when throwOnHTTPError = true', async () => {
    mockFetch(
      'https://x/404',
      text('nope', { status: 404, statusText: 'Not Found' }),
    );
    const api = new RequestClient({ throwOnHTTPError: true });
    await assertRejects(
      () => api.get('https://x/404'),
      Error,
      'HTTP 404 Not Found',
    );
  });

  it('returns response and data when throwOnHTTPError = false', async () => {
    mockFetch('https://x/tea', json({ a: 1 }, { status: 418 }));
    const api = new RequestClient({ throwOnHTTPError: false });
    const { response, data } = await api.get<{ a: number }>('https://x/tea');
    assertEquals(response.status, 418);
    assertEquals(data?.a, 1);
  });

  it('enforces .expect() rules', async () => {
    mockFetch('https://x/maybe-created', json({ ok: true }, { status: 201 }));
    mockFetch('https://x/maybe-created', json({ ok: true }, { status: 201 }));
    const api = new RequestClient();
    await api.request('https://x/maybe-created').expect([200, 201]).send();
    await assertRejects(
      () => api.request('https://x/maybe-created').expect(200).send(),
      Error,
      'Unexpected status 201',
    );
  });

  it('retries on 503 then succeeds', async () => {
    mockFetch('https://x/flaky', text('oops', { status: 503 }));
    mockFetch('https://x/flaky', text('oops', { status: 503 }));
    mockFetch('https://x/flaky', json({ ok: true }));

    const api = new RequestClient({
      throwOnHTTPError: false,
      retry: { retries: 2, baseDelayMs: 1, maxDelayMs: 5 },
    });
    const statuses: number[] = [];
    api.interceptors.response.use((ctx) => {
      statuses.push(ctx.response.status);
    });

    const { data } = await api.get<{ ok: boolean }>('https://x/flaky');
    assertEquals(statuses, [503, 503, 200]);
    assertEquals(data?.ok, true);
  });

  it('aborts on timeout', async () => {
    const originalFetch = globalThis.fetch;
    const api = new RequestClient({ timeoutMs: 20 });
    try {
      globalThis.fetch = (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Timeout', 'TimeoutError'));
          });
        });
      await assertRejects(() => api.get('https://x/slow'), Error);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('runs interceptors in order', async () => {
    const seen: string[] = [];
    mockFetch(
      { url: 'https://x/echo', headers: { 'x-one': '1' } },
      json({ ok: true }),
    );

    const api = new RequestClient();
    api.interceptors.request.use((c) => {
      c.init.headers?.set('x-one', '1');
      seen.push('req1');
    });
    api.interceptors.response.use((_r) => {
      seen.push('res1');
    });
    api.interceptors.error.use((_e) => {
      seen.push('err1');
      return _e;
    });

    const { data } = await api.get<{ ok: boolean }>('https://x/echo');
    assertEquals(data?.ok, true);
    assertEquals(seen, ['req1', 'res1']);
  });

  it('per-request retry override disables retries', async () => {
    mockFetch('https://x/always-503', text('fail', { status: 503 }));

    const api = new RequestClient({ retry: { retries: 3, baseDelayMs: 1 } });
    let attempts = 0;
    api.interceptors.request.use(() => {
      attempts += 1;
    });
    await assertRejects(
      () => api.request('https://x/always-503').retry(false).send(),
      Error,
      'HTTP 503',
    );
    assertEquals(attempts, 1);
  });

  it('json() and form() helpers set content-type & body', async () => {
    mockFetch('https://x/json', json({ ok: true }));
    mockFetch('https://x/form', json({ ok: true }));

    const api = new RequestClient();
    const requests: Array<{
      url: string;
      contentType: string | null;
      body: string | null;
    }> = [];
    api.interceptors.request.use((ctx) => {
      const { init } = ctx;
      const headerValue = init.headers?.get('content-type') ?? null;
      const rawBody = init.body;
      let body: string | null = null;
      if (typeof rawBody === 'string') body = rawBody;
      else if (rawBody instanceof URLSearchParams) body = rawBody.toString();
      else if (rawBody == null) body = null;
      else body = '[non-string]';
      requests.push({ url: ctx.url.href, contentType: headerValue, body });
    });

    const jRes = await api.request('https://x/json').json({ a: 1 }).send<
      { ok: boolean }
    >();
    const fRes = await api.request('https://x/form').form({ a: '1' }).send<
      { ok: boolean }
    >();
    assertEquals(jRes.data?.ok, true);
    assertEquals(fRes.data?.ok, true);

    assertEquals(requests.length, 2);
    assertEquals(requests[0].url, 'https://x/json');
    assertEquals(requests[0].contentType, 'application/json');
    assertEquals(requests[0].body, JSON.stringify({ a: 1 }));
    assertEquals(requests[1].url, 'https://x/form');
    assertEquals(
      requests[1].contentType,
      'application/x-www-form-urlencoded;charset=UTF-8',
    );
    assertEquals(
      requests[1].body,
      new URLSearchParams({ a: '1' }).toString(),
    );
  });
});

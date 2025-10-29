# RequestClient

_A tiny, dependency‑free, axios‑style fetch wrapper for Deno, Bun, Node 18+, and browsers._

`RequestClient` adds high‑level ergonomics on top of the Web Fetch API:

- **Instance defaults**: `baseURL`, headers, timeout, retry policy, `throwOnHTTPError`.
- **Fluent request builder**: `client.request('/users').method('POST').json(body).timeout(5000).send<T>()`.
- **Interceptors**: axios‑style `request` / `response` / `error` hooks.
- **Typed responses**: `send<T>()` with smart body parsing (`json`/`text`/`bytes`/`stream`/`auto`).
- **Retries**: exponential/linear/custom backoff, jitter, and a pluggable `retryOn` predicate.
- **Timeouts**: powered by `AbortController`.
- **Zero deps**: portable and tree‑shakeable.

> ⚠️ Naming: this wrapper uses `RequestClient` to avoid conflict with `Deno.HttpClient`.

---

## Installation

This module is dependency‑free; copy `request.client.ts` into your project or publish it as an internal module.

**Deno**

```ts
import { RequestClient } from './request.client.ts';
```

**Node 18+ / Bun** (ESM):

```ts
import { RequestClient } from './http-client.js'; // after transpiling TS → JS
```

**Browser** (bundled):

```ts
import { RequestClient } from './http-client.js';
```

---

## Quick start

```ts
import { RequestClient } from './request.client.ts';

const api = new RequestClient({
  baseURL: 'https://api.example.com/v1',
  headers: { 'x-app': 'on-the-edge' },
  timeoutMs: 10_000,
  retry: { retries: 2, baseDelayMs: 200 },
});

// Optional: interceptors
api.interceptors.request.use((ctx) => {
  ctx.init.headers?.set('x-request-id', crypto.randomUUID());
});

api.interceptors.response.use((ctx) => {
  console.log(
    ctx.request.meta.label ?? ctx.request.url.href,
    ctx.response.status,
  );
});

// Typed call
const { data, response } = await api
  .request('/users')
  .label('list users')
  .query({ page: 1, size: 20 })
  .send<{ users: Array<{ id: string; name: string }> }>();

console.log(response.status, data.users.length);
```

---

## Core concepts

### 1) Instance defaults

Create a client with shared defaults for base URL, headers, timeouts, error semantics, and retry policy.

```ts
const client = new RequestClient({
  baseURL: 'https://api.example.com',
  headers: { Authorization: `Bearer ${token}` },
  timeoutMs: 15_000,
  throwOnHTTPError: true, // throw on non-2xx by default
  retry: { retries: 3, baseDelayMs: 250, maxDelayMs: 10_000 },
});
```

### 2) Fluent request builder

Every call starts with `client.request(pathOrUrl)` and chains options until `.send<T>()`.

```ts
const res = await client
  .request('/posts')
  .method('POST')
  .json({ title: 'Hello' })
  .timeout(5_000)
  .expect((s) => s === 201)
  .send<{ id: string }>();
```

Convenience verbs:

```ts
await client.get('/health');
await client.post('/items', { name: 'A' });
await client.put('/items/1', { name: 'B' });
await client.patch('/items/1', { name: 'C' });
await client.delete('/items/1');
await client.head('/items/1');
```

### 3) Interceptors

Axios‑style hooks let you mutate requests, inspect responses, or map errors.

```ts
const remove = (fn: any) => api.interceptors.request.eject(fn);

api.interceptors.request.use((ctx) => {
  ctx.init.headers?.set('x-tenant', 'acme');
});

api.interceptors.response.use((ctx) => {
  if (ctx.response.status === 204) ctx.data = undefined;
});

api.interceptors.error.use((err) => {
  // Translate 401 into a domain error type, or trigger token refresh
  if (err.response?.status === 401) {
    err.message = 'Unauthorized';
  }
});
```

### 4) Parsing modes

Control how the body is read:

- `"auto"` (default): infer via `Content-Type` (`application/json` → `json()`, `text/*` → `text()`, else `arrayBuffer()` as `Uint8Array`).
- `"json"`, `"text"`, `"bytes"`, `"stream"` (ReadableStream), or `null` (don’t parse).

```ts
const { data } = await client.request('/binary').parse('bytes').send<
  Uint8Array
>();
```

### 5) Error handling

- If `throwOnHTTPError = true` and `response.ok === false`, a **HttpError** is thrown with `{ request, response, data }`.
- Network/timeout/parse failures also throw `HttpError`.
- Set `.options({ throwOnHTTPError: false })` per request to handle non‑2xx yourself.

```ts
try {
  await client.get('/requires-auth');
} catch (e) {
  if (e instanceof Error) console.error(e.message);
}
```

### 6) Status expectations

Assert acceptable statuses with `.expect()`; throws `HttpError` if predicate fails.

```ts
await client.request('/upload').expect([200, 201]).send();
```

### 7) Retries

Configure once or per request. Default policy retries on `408`, `429`, and `5xx`, and on network/timeout errors.

```ts
const stable = client.extend({ retry: { retries: 3, backoff: 'exponential' } });

await stable
  .request('/unstable')
  .retry({ retries: 5, baseDelayMs: 100, maxDelayMs: 3000 })
  .send();
```

You can supply a custom predicate:

```ts
.retry({
  retries: 3,
  retryOn: ({ response }) => !!response && [502, 503, 504].includes(response.status),
})
```

### 8) Timeouts & Abort

All requests respect `timeoutMs` via `AbortController`.

```ts
await client.request('/slow').timeout(2_000).send();
```

You can also pass your own `AbortSignal` through `fetchImpl` if needed (advanced).

### 9) Forms, files, and streams

```ts
// JSON
await client.request('/items').json({ name: 'A' }).send();

// URL-encoded form
await client.request('/login').form({ user: 'u', pass: 'p' }).send();

// FormData / file upload
const form = new FormData();
form.append(
  'file',
  new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' }),
  'file.bin',
);
await client.request('/upload').body(form).send();
```

### 10) Type‑safe usage

```ts
type User = { id: string; name: string };
const { data } = await client.get<{ users: User[] }>('/users');
```

---

## API Reference (summary)

### `class RequestClient`

**Constructor** `new RequestClient(defaults?: HttpClientDefaults)`

Defaults:

- `baseURL?: string`
- `headers?: HeadersInit`
- `timeoutMs?: number` (default `20000`)
- `fetchImpl?: typeof fetch` (inject for tests)
- `throwOnHTTPError?: boolean` (default `true`)
- `retry?: Partial<RetryPolicy> | false`

**Methods**

- `extend(overrides: Partial<HttpClientDefaults>): RequestClient`
- `request(pathOrUrl?: string): RequestBuilder`
- Shorthands: `get/post/put/patch/delete/head`

**Interceptors**

- `interceptors.request.use(fn) / eject(fn)`
- `interceptors.response.use(fn) / eject(fn)`
- `interceptors.error.use(fn) / eject(fn)`

### `class RequestBuilder`

- Chain: `.method(m) .url(s) .query(q) .header(k,v) .headers(init) .timeout(ms) .parse(mode) .expect(rule) .label(text) .retry(policy|false) .json(obj) .form(data) .body(body)`
- Execute: `.send<T>(): Promise<{ request: RequestContext; response: Response; data?: T }>`

### Types

- `RetryPolicy`: `{ retries: number; baseDelayMs?: number; maxDelayMs?: number; backoff?: "exponential"|"linear"|((attempt:number)=>number); retryOn?: (ctx)=>boolean }`
- `RequestContext`: `{ url: URL; init: RequestInit & { headers?: Headers }; meta: { timeoutMs?; throwOnHTTPError?; parse?; expectStatus?; label? } }`
- `ResponseContext<T>`: `{ request: RequestContext; response: Response; data?: T }`
- `HttpError extends Error`: `{ request?; response?; data?; cause? }`

---

## Cookbook

### Auth token refresh

```ts
let refreshing: Promise<string> | null = null;

api.interceptors.error.use(async (err) => {
  if (err.response?.status !== 401) return err;
  if (!refreshing) refreshing = refreshToken();
  const newToken = await refreshing.finally(() => (refreshing = null));
  // Retry original request with new token
  const { url, init } = err.request!;
  init.headers?.set('authorization', `Bearer ${newToken}`);
  return await api.request(url.toString()).options({ headers: init.headers })
    .send();
});
```

### Idempotent retries on POST with body

If your server supports idempotency keys:

```ts
api.interceptors.request.use((c) => {
  if (c.init.method === 'POST') {
    c.init.headers?.set('idempotency-key', crypto.randomUUID());
  }
});
```

### Structured logging

```ts
api.interceptors.response.use((ctx) => {
  console.info('http', {
    url: ctx.request.url.href,
    status: ctx.response.status,
    label: ctx.request.meta.label,
  });
});
```

---

## Environment compatibility

- **Deno**: native. No Node APIs.
- **Node 18+**: global `fetch` exists; otherwise polyfill or inject via `fetchImpl`.
- **Bun**: native.
- **Browser**: native.

Inject a custom fetch (for tests/mocks):

```ts
const client = new RequestClient({ fetchImpl: myMockFetch });
```

---

## Testing guidance

- Extracted helpers (`mergeHeaders`, `buildURL`, `toSearchParams`, `computeDelay`, `parseBody`, etc.) are pure and easy to unit test.
- Validate URL resolution with/without `baseURL` and query merges.
- Verify header merging is case‑insensitive (last write wins).
- Simulate `AbortController` timeouts.
- Assert retry backoff calls and `retryOn` predicate behavior.
- Confirm `.expect()` throws on mismatched statuses.

---

## Troubleshooting

- **Getting `TypeError: fetch failed`** → usually network or CORS; inspect `HttpError.cause` and `response` if present.
- **Non‑2xx not throwing** → ensure `throwOnHTTPError: true` or set `.options({ throwOnHTTPError: true })`.
- **Double‑reading body** → don’t read `response.body` manually when using `parse != null`.
- **Headers not applied** → remember `.headers()` replaces/merges; `.header(k,v)` sets a single value.

---

## FAQ

**Why not use Axios?**
Axios is great, but this wrapper remains spec‑aligned with `fetch`, is lighter, and works uniformly in Deno without shims.

**Can I use this in a service worker?**
Yes. No DOM assumptions are made.

**How do I add query arrays?**
Pass `query: { tags: ["a","b"] }` or a `URLSearchParams`.

---

## License

```
Copyright 2025 AniTrend

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

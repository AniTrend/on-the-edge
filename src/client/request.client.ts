// file: request.client.ts
// Deno-first, axios-like fetch wrapper with builder requests, instance defaults,
// interceptors, retries, timeout, and typed responses. No external deps.
// Works in Deno, Bun, Node (v18+), and browsers.

/** Supported HTTP verbs recognised by {@link RequestClient}. */
export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

/**
 * Retry configuration surfaced in the README (backoff strategy, caps, predicate).
 */
export interface RetryPolicy {
  retries: number; // total attempts = 1 + retries
  baseDelayMs?: number; // default 250ms
  maxDelayMs?: number; // default 10_000ms
  backoff?: 'exponential' | 'linear' | ((attempt: number) => number);
  // Which errors/status codes should trigger a retry
  retryOn?: (ctx: {
    attempt: number; // 1-based
    error?: unknown;
    response?: Response;
  }) => boolean;
}

/**
 * Instance-level defaults applied to every request. Mirrors the "Instance
 * defaults" section of the README.
 */
export interface HttpClientDefaults {
  baseURL?: string;
  headers?: HeadersInit;
  timeoutMs?: number; // Abort if exceeded
  /**
   * Optional fetch implementation override. Retained alongside @c4spar/mock-fetch so
   * callers can inject polyfills (Node < 18), platform-specific clients, or
   * bespoke instrumentation without mutating global fetch.
   */
  fetchImpl?: typeof fetch;
  // If true, throw HttpError for non-2xx. If false, never throws based on status.
  throwOnHTTPError?: boolean;
  retry?: Partial<RetryPolicy> | false;
}

/** Internal request metadata passed through interceptors and retry handlers. */
export interface RequestContext {
  url: URL;
  init: RequestInit & { headers?: Headers };
  meta: {
    // per-request options
    timeoutMs?: number;
    throwOnHTTPError?: boolean;
    parse?: 'json' | 'text' | 'bytes' | 'stream' | 'auto' | null; // null => caller handles
    expectStatus?: number | number[] | ((status: number) => boolean);
    label?: string; // free-form for logging
  };
}

/** Wire format returned by {@link RequestBuilder.send}. */
export interface ResponseContext<T = unknown> {
  request: RequestContext;
  response: Response;
  data?: T; // parsed body if available
}

export type RequestInterceptor = (
  ctx: RequestContext,
) => Promise<RequestContext | void> | RequestContext | void;

export type ResponseInterceptor<T = unknown> = (
  ctx: ResponseContext<T>,
) => Promise<ResponseContext<T> | void> | ResponseContext<T> | void;

export type ErrorInterceptor = (
  error: HttpError,
) => Promise<HttpError | void> | HttpError | void;

/**
 * Rich error wrapper thrown when network failures, timeouts, or status/expect
 * checks fail.
 */
export class HttpError extends Error {
  override name = 'HttpError';
  request?: RequestContext;
  response?: Response;
  data?: unknown;
  override cause?: unknown;

  constructor(message: string, opts: Partial<HttpError> = {}) {
    super(message);
    Object.assign(this, opts);
  }
}

/** Utility: merge headers (case-insensitive) */
function mergeHeaders(a?: HeadersInit, b?: HeadersInit): Headers {
  const h = new Headers(a ?? {});
  if (b) new Headers(b).forEach((v, k) => h.set(k, v));
  return h;
}

/** Utility: build URL with base & query params */
function buildURL(
  base: string | undefined,
  pathOrUrl: string,
  qp?: Record<string, unknown> | URLSearchParams,
): URL {
  const url = (() => {
    try {
      return new URL(pathOrUrl);
    } catch { /* not absolute */ }
    const baseUrl = base
      ? new URL(base.replace(/\/$/, '/'))
      : new URL('/', 'http://local');
    // If pathOrUrl starts with '/', use origin from base
    if (pathOrUrl.startsWith('/')) {
      return new URL(pathOrUrl, base ? new URL(base) : baseUrl);
    }
    return new URL(pathOrUrl, base ? new URL(base) : baseUrl);
  })();
  if (qp) {
    const search = qp instanceof URLSearchParams ? qp : toSearchParams(qp);
    for (const [k, v] of search.entries()) url.searchParams.set(k, v);
  }
  return url;
}

function toSearchParams(obj: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) { for (const item of v) sp.append(k, String(item)); }
    else if (typeof v === 'object') sp.append(k, JSON.stringify(v));
    else sp.append(k, String(v));
  }
  return sp;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function computeDelay(
  attempt: number,
  policy: Required<Omit<RetryPolicy, 'retryOn'>>,
) {
  const { baseDelayMs, maxDelayMs, backoff } = policy;
  const raw = typeof backoff === 'function'
    ? backoff(attempt)
    : backoff === 'linear'
    ? baseDelayMs * attempt
    : baseDelayMs * 2 ** (attempt - 1);
  // jitter ±25%
  const jitter = raw * (1 + (Math.random() - 0.5) * 0.5);
  return Math.min(maxDelayMs, Math.max(0, Math.floor(jitter)));
}

/**
 * High-level fetch wrapper offering the ergonomics outlined in the README:
 * instance defaults, fluent builder, interceptors, retry policy, and
 * auto-parsing.
 */
export class RequestClient {
  readonly defaults: Required<HttpClientDefaults>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * Create a client with optional global defaults (baseURL, headers, retry,
   * timeout, error semantics, or custom fetch implementation).
   */
  constructor(defaults: HttpClientDefaults = {}) {
    this.defaults = {
      baseURL: defaults.baseURL ?? undefined,
      headers: defaults.headers ?? {},
      timeoutMs: defaults.timeoutMs ?? 20_000,
      fetchImpl: defaults.fetchImpl ?? (globalThis.fetch as typeof fetch),
      throwOnHTTPError: defaults.throwOnHTTPError ?? true,
      retry: defaults.retry ?? { retries: 0 },
    } as Required<HttpClientDefaults>;
  }

  /**
   * Axios-style interceptor registry. Functions execute sequentially in the
   * order they are registered.
   */
  interceptors = {
    request: {
      use: (fn: RequestInterceptor) => this.requestInterceptors.push(fn),
      eject: (fn: RequestInterceptor) =>
        this._eject(this.requestInterceptors, fn),
    },
    response: {
      use: (fn: ResponseInterceptor) => this.responseInterceptors.push(fn),
      eject: (fn: ResponseInterceptor) =>
        this._eject(this.responseInterceptors, fn),
    },
    error: {
      use: (fn: ErrorInterceptor) => this.errorInterceptors.push(fn),
      eject: (fn: ErrorInterceptor) => this._eject(this.errorInterceptors, fn),
    },
  } as const;

  private _eject<T>(arr: T[], fn: T) {
    const idx = arr.indexOf(fn);
    if (idx >= 0) arr.splice(idx, 1);
  }

  /**
   * Clone the existing client, overriding selected defaults (baseURL, headers,
   * retry policy, etc.).
   */
  extend(overrides: Partial<HttpClientDefaults>): RequestClient {
    return new RequestClient({
      ...this.defaults,
      ...overrides,
      headers: mergeHeaders(this.defaults.headers, overrides.headers),
    });
  }

  /**
   * Start a {@link RequestBuilder}. Accepts absolute URLs or paths resolved
   * against the configured baseURL.
   */
  request(pathOrUrl = ''): RequestBuilder {
    return new RequestBuilder(this, pathOrUrl);
  }

  // Convenience verbs
  /** Issue a GET request using the builder defaults. */
  get<T = unknown>(path: string, opts?: RequestOptions) {
    return this.request(path).method('GET').options(opts).send<T>();
  }
  /** Issue a DELETE request using the builder defaults. */
  delete<T = unknown>(path: string, opts?: RequestOptions) {
    return this.request(path).method('DELETE').options(opts).send<T>();
  }
  /** Issue a HEAD request using the builder defaults. */
  head(path: string, opts?: RequestOptions) {
    return this.request(path).method('HEAD').options(opts).send<void>();
  }
  /** Issue a POST request with convenience JSON encoding by default. */
  post<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request(path).method('POST').options(opts).json(body).send<T>();
  }
  /** Issue a PUT request with convenience JSON encoding by default. */
  put<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request(path).method('PUT').options(opts).json(body).send<T>();
  }
  /** Issue a PATCH request with convenience JSON encoding by default. */
  patch<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request(path).method('PATCH').options(opts).json(body).send<
      T
    >();
  }
}

/** Per-call overrides accepted by the convenience verbs. */
export interface RequestOptions {
  headers?: HeadersInit;
  query?: Record<string, unknown> | URLSearchParams;
  timeoutMs?: number;
  throwOnHTTPError?: boolean;
  parse?: RequestContext['meta']['parse']; // default auto
  expectStatus?: RequestContext['meta']['expectStatus']; // optional
  label?: string;
  // Retry overrides per request
  retry?: Partial<RetryPolicy> | false;
}

/**
 * Fluent builder returned by {@link RequestClient.request}. Supports method,
 * headers, query params, parsing strategy, retry overrides, and body helpers.
 */
export class RequestBuilder {
  private client: RequestClient;
  private method_: HttpMethod = 'GET';
  private urlPathOrUrl: string;
  private queryParams?: Record<string, unknown> | URLSearchParams;
  private headers_: Headers = new Headers();
  private body_?: BodyInit | null;
  private meta: RequestContext['meta'] = { parse: 'auto' };
  private retryOverride?: Partial<RetryPolicy> | false;

  /** Internal use only; created via {@link RequestClient.request}. */
  constructor(client: RequestClient, pathOrUrl: string) {
    this.client = client;
    this.urlPathOrUrl = pathOrUrl;
  }

  /** Set the HTTP method (defaults to GET). */
  method(m: HttpMethod) {
    this.method_ = m;
    return this;
  }
  /** Override the target URL or path (resolved against baseURL). */
  url(pathOrUrl: string) {
    this.urlPathOrUrl = pathOrUrl;
    return this;
  }
  /** Derive a child client with a different baseURL. */
  baseURL(_base: string) {
    this.client = this.client.extend({ baseURL: _base });
    return this;
  }
  /** Merge query parameters into the request URL. */
  query(q: Record<string, unknown> | URLSearchParams) {
    this.queryParams = q;
    return this;
  }
  /** Set/override a single header value (case-insensitive). */
  header(k: string, v: string) {
    this.headers_.set(k, v);
    return this;
  }
  /** Merge multiple headers at once. */
  headers(h: HeadersInit) {
    this.headers_ = mergeHeaders(this.headers_, h);
    return this;
  }
  /** Override the per-request timeout (AbortController). */
  timeout(ms: number) {
    this.meta.timeoutMs = ms;
    return this;
  }
  /** Control body parsing ("auto", "json", "text", "bytes", "stream", null). */
  parse(mode: RequestContext['meta']['parse']) {
    this.meta.parse = mode;
    return this;
  }
  /** Assert acceptable status codes or provide a predicate. */
  expect(status: RequestContext['meta']['expectStatus']) {
    this.meta.expectStatus = status;
    return this;
  }
  /** Attach a label for downstream logging and tracing. */
  label(text: string) {
    this.meta.label = text;
    return this;
  }
  /** Override or disable the retry policy for this request. */
  retry(policy: Partial<RetryPolicy> | false) {
    this.retryOverride = policy;
    return this;
  }

  /** Supply an arbitrary body payload (FormData, Blob, string, etc.). */
  body(b: BodyInit | null) {
    this.body_ = b;
    return this;
  }

  /** JSON-encode the body and ensure the content-type header. */
  json(obj: unknown) {
    if (!this.headers_.has('content-type')) {
      this.headers_.set('content-type', 'application/json');
    }
    this.body_ = obj == null ? null : JSON.stringify(obj);
    return this;
  }

  /** Encode the payload as application/x-www-form-urlencoded by default. */
  form(data: Record<string, string | Blob> | URLSearchParams | FormData) {
    if (data instanceof URLSearchParams || data instanceof FormData) {
      this.body_ = data as BodyInit;
    } else {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(data)) {
        usp.append(k, typeof v === 'string' ? v : (v as Blob).toString());
      }
      this.body_ = usp as BodyInit;
    }
    if (!this.headers_.has('content-type')) {
      this.headers_.set(
        'content-type',
        'application/x-www-form-urlencoded;charset=UTF-8',
      );
    }
    return this;
  }

  /** Apply the {@link RequestOptions} struct to the builder. */
  options(opts?: RequestOptions) {
    if (!opts) return this;
    if (opts.headers) this.headers(opts.headers);
    if (opts.query) this.query(opts.query);
    if (opts.timeoutMs != null) this.timeout(opts.timeoutMs);
    if (opts.throwOnHTTPError != null) {
      this.meta.throwOnHTTPError = opts.throwOnHTTPError;
    }
    if (opts.parse != null) this.meta.parse = opts.parse;
    if (opts.expectStatus != null) this.meta.expectStatus = opts.expectStatus;
    if (opts.label) this.meta.label = opts.label;
    if (opts.retry !== undefined) this.retryOverride = opts.retry;
    return this;
  }

  /** Execute the request, returning the parsed response and metadata. */
  async send<T = unknown>(): Promise<ResponseContext<T>> {
    const defaults = this.client.defaults;
    const url = buildURL(defaults.baseURL, this.urlPathOrUrl, this.queryParams);

    const headers = mergeHeaders(defaults.headers, this.headers_);

    const ctx: RequestContext = {
      url,
      init: { method: this.method_, headers, body: this.body_ },
      meta: {
        timeoutMs: this.meta.timeoutMs ?? defaults.timeoutMs,
        throwOnHTTPError: this.meta.throwOnHTTPError ??
          defaults.throwOnHTTPError,
        parse: this.meta.parse ?? 'auto',
        expectStatus: this.meta.expectStatus,
        label: this.meta.label,
      },
    };

    // Run request interceptors sequentially
    const reqCtx = await this.applyRequestInterceptors(ctx);

    // Execute with retry policy
    const retryPolicy = this.resolveRetryPolicy();
    const attempts = Math.max(0, retryPolicy.retries) + 1;

    let lastError: HttpError | undefined;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const resCtx = await this.performOnce<T>(reqCtx);

        // Retry decision hook
        if (
          attempt < attempts &&
          retryPolicy.retryOn?.({ attempt, response: resCtx.response })
        ) {
          const delay = computeDelay(
            attempt,
            this.ensureRetryDefaults(retryPolicy),
          );
          await sleep(delay);
          continue;
        }
        return resCtx;
      } catch (e) {
        const httpErr = e instanceof HttpError
          ? e
          : new HttpError('Request failed', { request: reqCtx, cause: e });

        if (
          attempt < attempts &&
          retryPolicy.retryOn?.({ attempt, error: httpErr })
        ) {
          const delay = computeDelay(
            attempt,
            this.ensureRetryDefaults(retryPolicy),
          );
          await sleep(delay);
          lastError = httpErr; // keep for context if still failing later
          continue;
        }
        // Give error interceptors a chance to transform/swallow
        const intercepted = await this.applyErrorInterceptors(httpErr);
        throw intercepted ?? httpErr;
      }
    }

    // Should never reach here
    throw lastError ??
      new HttpError('Exhausted retries without specific error');
  }

  private async performOnce<T>(
    ctx: RequestContext,
  ): Promise<ResponseContext<T>> {
    const { url, init, meta } = ctx;
    const controller = new AbortController();
    const timeout = meta.timeoutMs && meta.timeoutMs > 0
      ? setTimeout(
        () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
        meta.timeoutMs,
      )
      : null;

    const initWithSignal: RequestInit = { ...init, signal: controller.signal };

    try {
      const resp = await this.client.defaults.fetchImpl(url, initWithSignal);
      // Expectation check
      if (meta.expectStatus) {
        const ok = typeof meta.expectStatus === 'function'
          ? meta.expectStatus(resp.status)
          : Array.isArray(meta.expectStatus)
          ? meta.expectStatus.includes(resp.status)
          : resp.status === meta.expectStatus;
        if (!ok) {
          throw new HttpError(`Unexpected status ${resp.status}`, {
            request: ctx,
            response: resp,
          });
        }
      }

      // Throw on non-2xx if configured
      if (meta.throwOnHTTPError && !resp.ok) {
        const data = await safeParse(resp);
        throw new HttpError(`HTTP ${resp.status} ${resp.statusText}`.trim(), {
          request: ctx,
          response: resp,
          data,
        });
      }

      // Parse body as requested
      const parsed = await parseBody<T>(resp, meta.parse);
      let resCtx: ResponseContext<T> = {
        request: ctx,
        response: resp,
        data: parsed,
      };

      // Run response interceptors sequentially
      resCtx = (await this.applyResponseInterceptors(resCtx)) ?? resCtx;
      return resCtx;
    } catch (err) {
      // Wrap into HttpError consistently
      const httpErr = err instanceof HttpError
        ? err
        : new HttpError(err instanceof Error ? err.message : String(err), {
          request: ctx,
          cause: err,
        });
      throw httpErr;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async applyRequestInterceptors(
    ctx: RequestContext,
  ): Promise<RequestContext> {
    let current = ctx;
    for (const fn of this.client['requestInterceptors']) {
      const next = await fn(current);
      if (next) current = next;
    }
    // Ensure headers are Headers instance
    current.init.headers = mergeHeaders(current.init.headers, {});
    return current;
  }

  private async applyResponseInterceptors<T>(
    ctx: ResponseContext<T>,
  ): Promise<ResponseContext<T> | undefined> {
    let current: ResponseContext<T> | undefined = ctx;
    const interceptors = this
      .client['responseInterceptors'] as ResponseInterceptor<T>[];
    for (const fn of interceptors) {
      if (!current) break;
      const next = await fn(current);
      current = next ?? current;
    }
    return current;
  }

  private async applyErrorInterceptors(
    err: HttpError,
  ): Promise<HttpError | undefined> {
    let current: HttpError | undefined = err;
    for (const fn of this.client['errorInterceptors']) {
      if (!current) break; // swallowed
      const next = await fn(current);
      current = next ?? current;
    }
    return current;
  }

  private resolveRetryPolicy(): RetryPolicy {
    const base = this.client.defaults.retry;
    const override = this.retryOverride;
    if (override === false) return { retries: 0 };
    const merged: RetryPolicy = {
      retries: 0,
      baseDelayMs: 250,
      maxDelayMs: 10_000,
      backoff: 'exponential',
      retryOn: defaultRetryOn,
      ...(base && typeof base === 'object' ? base : {}),
      ...(override && typeof override === 'object' ? override : {}),
    };
    return merged;
  }

  private ensureRetryDefaults(
    policy: RetryPolicy,
  ): Required<Omit<RetryPolicy, 'retryOn'>> {
    return {
      baseDelayMs: policy.baseDelayMs ?? 250,
      maxDelayMs: policy.maxDelayMs ?? 10_000,
      backoff: policy.backoff ?? 'exponential',
      retries: policy.retries ?? 0,
    };
  }
}

function defaultRetryOn(
  { error, response }: {
    attempt: number;
    error?: unknown;
    response?: Response;
  },
): boolean {
  if (response) {
    // Retry on 408, 429, and 5xx
    if ([408, 429].includes(response.status)) return true;
    if (response.status >= 500) return true;
    return false;
  }
  if (error) {
    // Network errors or AbortError that wasn't caused by caller cancel
    if (error instanceof HttpError && error.cause) {
      const c = error.cause as unknown;
      if (isAbortError(c)) return true; // transient timeout treated as retryable
    }
    // In browsers & Deno, TypeError often indicates network failure
    if (error instanceof TypeError) return true;
    return false;
  }
  return false;
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException &&
    (e.name === 'AbortError' || e.name === 'TimeoutError');
}

async function parseBody<T>(
  resp: Response,
  mode: RequestContext['meta']['parse'],
) {
  if (mode === null) return undefined as unknown as T; // caller handles
  if (mode === 'stream') return resp.body as unknown as T;
  if (mode === 'bytes') {
    return new Uint8Array(await resp.arrayBuffer()) as unknown as T;
  }
  if (mode === 'text') return await resp.text() as unknown as T;
  if (mode === 'json') return await resp.json() as T;
  // auto: infer from content-type
  const ctype = resp.headers.get('content-type')?.toLowerCase() ?? '';
  if (ctype.includes('application/json')) return await resp.json() as T;
  if (ctype.startsWith('text/')) return await resp.text() as unknown as T;
  return new Uint8Array(await resp.arrayBuffer()) as unknown as T;
}

async function safeParse(resp: Response): Promise<unknown> {
  try {
    const ctype = resp.headers.get('content-type')?.toLowerCase() ?? '';
    if (ctype.includes('application/json')) return await resp.json();
    if (ctype.startsWith('text/')) return await resp.text();
    return await resp.arrayBuffer();
  } catch {
    return undefined;
  }
}

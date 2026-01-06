/**
 * Generic mock fetch helpers for testing HTTP interactions.
 *
 * Provides utilities to mock HTTP responses using @c4spar/mock-fetch.
 * These helpers accept full URLs to avoid hardcoding service endpoints.
 *
 * Usage pattern matches real service tests:
 * 1. Services get base URLs from SecretService
 * 2. RequestClient constructs full URLs
 * 3. Tests mock the complete URL with realistic fixtures
 *
 * @example
 * ```typescript
 * import { mockJsonResponse, resetFetch, createMockSecret } from '@scope/common/testing';
 *
 * // In test setup
 * const secrets = createMockSecret({ MAL: 'https://mal.test' }).service;
 * const malBase = secrets.get('MAL');
 *
 * mockJsonResponse(`${malBase}/anime/100/full`, {
 *   mal_id: 100,
 *   title: 'Test Anime',
 *   // ... full AnimeResource fields
 * });
 *
 * // In test teardown
 * afterEach(() => {
 *   resetFetch();
 * });
 * ```
 */

import { mockFetch, resetFetch as resetGlobalFetch } from '@c4spar/mock-fetch';

/**
 * Options for customizing mock responses
 */
export interface MockResponseOptions {
  /** HTTP status code (default: 200) */
  status?: number;
  /** Additional response headers */
  headers?: Record<string, string>;
}

/**
 * Mock a fetch request with a raw response body
 *
 * Use this when you need to mock non-JSON responses (HTML, XML, plain text, etc.).
 * For JSON responses, prefer `mockJsonResponse`.
 *
 * @param url - Full URL to mock (including query params)
 * @param body - Response body (string or object)
 * @param options - Optional response customization
 *
 * @example
 * ```typescript
 * mockResponse('https://mal.test/anime/100', '<html>...</html>', {
 *   status: 200,
 *   headers: { 'content-type': 'text/html' }
 * });
 * ```
 */
export function mockResponse(
  url: string,
  body: string | object,
  options: MockResponseOptions = {},
): void {
  const { status = 200, headers = {} } = options;

  mockFetch(url, {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    status,
    headers,
  });
}

/**
 * Mock a fetch request that returns JSON data
 *
 * Automatically sets Content-Type header to application/json.
 * This is the most common helper for testing API services.
 *
 * The URL should be the FULL URL including base domain and query params.
 * This matches the pattern used in real service tests where:
 * - Services get base URLs from SecretService
 * - RequestClient constructs full URLs
 * - Tests mock the complete endpoint
 *
 * @param url - Full URL to mock (including query params)
 * @param data - Response data (will be JSON stringified)
 * @param options - Optional response customization
 *
 * @example
 * ```typescript
 * // Mock a Jikan API anime request
 * const malBase = 'https://mal.test';
 * mockJsonResponse(`${malBase}/anime/100/full`, {
 *   mal_id: 100,
 *   title: 'Test Anime',
 *   url: 'https://mal.test/anime/100',
 *   images: {
 *     jpg: { image_url: '...', small_image_url: '...', large_image_url: '...' },
 *     webp: { image_url: '...', small_image_url: '...', large_image_url: '...' }
 *   },
 *   titles: [{ type: 'Default', title: 'Test Anime' }],
 *   // ... full AnimeResource fields
 * });
 *
 * // Mock a Skyhook API show request
 * const skyhookBase = 'https://skyhook.test';
 * mockJsonResponse(`${skyhookBase}/shows/123`, {
 *   tvdbId: 123,
 *   title: 'Test Show',
 *   slug: 'test-show',
 *   firstAired: '2020-01-01',
 *   lastUpdated: '2023-01-01',
 *   seasons: [{ seasonNumber: 1, name: 'Season 1' }],
 *   episodes: [...]
 * });
 *
 * // Mock an ARM API mappings request
 * const armBase = 'https://arm.test';
 * mockJsonResponse(`${armBase}/api/v2/ids?source=anilist&id=300`, {
 *   anilist: 300,
 *   myanimelist: 100,
 *   imdb: 'tt1234567',
 *   thetvdb: 123
 * });
 *
 * // Mock error responses
 * mockJsonResponse('https://mal.test/anime/999', {
 *   error: 'Not Found'
 * }, { status: 404 });
 * ```
 */
export function mockJsonResponse(
  url: string,
  data: unknown,
  options: MockResponseOptions = {},
): void {
  const { status = 200, headers = {} } = options;

  mockFetch(url, {
    body: JSON.stringify(data),
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Reset all mocked fetch calls
 *
 * Should be called in test cleanup (afterEach) to ensure isolation between tests.
 * Uses resetGlobalFetch from @c4spar/mock-fetch to clear all registered mocks.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetFetch();
 * });
 * ```
 */
export function resetFetch(): void {
  resetGlobalFetch();
}

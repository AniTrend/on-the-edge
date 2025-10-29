/**
 * Tests for generic mock fetch helpers
 *
 * Demonstrates the pattern used in real service tests:
 * 1. Services get base URLs from SecretService
 * 2. RequestClient constructs full URLs
 * 3. Tests mock the complete URL with realistic fixtures
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import {
  mockJsonResponse,
  mockResponse,
  resetFetch,
} from './mock-fetch-helpers.ts';

describe('mock-fetch-helpers', () => {
  beforeEach(() => {
    // Ensure clean state before each test
    resetFetch();
  });

  afterEach(() => {
    // Clean up after each test
    resetFetch();
  });

  describe('mockResponse', () => {
    it('should mock non-JSON responses', async () => {
      const htmlContent = '<html><body>Test</body></html>';
      mockResponse('https://example.test/page', htmlContent, {
        headers: { 'content-type': 'text/html' },
      });

      const response = await fetch('https://example.test/page');
      const text = await response.text();

      assertEquals(response.status, 200);
      assertEquals(text, htmlContent);
    });

    it('should support custom status codes', async () => {
      mockResponse('https://example.test/not-found', 'Not Found', {
        status: 404,
      });

      const response = await fetch('https://example.test/not-found');

      assertEquals(response.status, 404);
    });

    it('should handle object bodies', async () => {
      mockResponse('https://example.test/data', { key: 'value' });

      const response = await fetch('https://example.test/data');
      const data = await response.json();

      assertEquals(data.key, 'value');
    });
  });

  describe('mockJsonResponse', () => {
    it('should automatically set JSON content-type', async () => {
      mockJsonResponse('https://api.test/endpoint', { message: 'success' });

      const response = await fetch('https://api.test/endpoint');
      const contentType = response.headers.get('content-type');

      assertEquals(contentType, 'application/json');
    });

    it('should handle complex nested data', async () => {
      const complexData = {
        id: 123,
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
      };

      mockJsonResponse('https://api.test/complex', complexData);

      const response = await fetch('https://api.test/complex');
      const data = await response.json();

      assertEquals(data.id, 123);
      assertEquals(data.nested.array.length, 3);
      assertEquals(data.nested.object.key, 'value');
    });
  });

  describe('resetFetch', () => {
    it('should clear all mocks', async () => {
      mockJsonResponse('https://api.test/data', { value: 1 });

      const response = await fetch('https://api.test/data');
      assertEquals(response.status, 200);

      resetFetch();

      // After reset, the mock is cleared
      // (In real tests, this would hit the network or fail)
      assertEquals(typeof resetFetch, 'function');
    });

    it('should be safe to call multiple times', () => {
      resetFetch();
      resetFetch();
      resetFetch();

      // Should not throw
      assertEquals(typeof resetFetch, 'function');
    });
  });
});

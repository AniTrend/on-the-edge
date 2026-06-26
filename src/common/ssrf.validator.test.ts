/**
 * Tests for SSRF-safe push endpoint validation.
 */

import { assertEquals } from '@std/assert';
import { isPrivateIp, validatePushEndpoint } from './ssrf.validator.ts';

// ---------------------------------------------------------------------------
// isPrivateIp — unit tests for IP range checking
// ---------------------------------------------------------------------------

Deno.test('isPrivateIp - private IPv4 addresses', () => {
  assertEquals(isPrivateIp('10.0.0.1'), true, '10.0.0.0/8');
  assertEquals(isPrivateIp('10.255.255.255'), true, '10.0.0.0/8 boundary');
  assertEquals(isPrivateIp('172.16.0.1'), true, '172.16.0.0/12');
  assertEquals(isPrivateIp('172.31.255.255'), true, '172.16.0.0/12 boundary');
  assertEquals(isPrivateIp('192.168.1.1'), true, '192.168.0.0/16');
  assertEquals(isPrivateIp('192.168.255.255'), true, '192.168.0.0/16 boundary');
});

Deno.test('isPrivateIp - loopback IPv4', () => {
  assertEquals(isPrivateIp('127.0.0.1'), true, '127.0.0.0/8');
  assertEquals(isPrivateIp('127.255.255.255'), true, '127.0.0.0/8 boundary');
});

Deno.test('isPrivateIp - link-local IPv4', () => {
  assertEquals(isPrivateIp('169.254.1.1'), true, '169.254.0.0/16');
  assertEquals(isPrivateIp('169.254.255.255'), true, '169.254.0.0/16 boundary');
});

Deno.test('isPrivateIp - multicast IPv4', () => {
  assertEquals(isPrivateIp('224.0.0.1'), true, '224.0.0.0/4');
  assertEquals(isPrivateIp('239.255.255.255'), true, '224.0.0.0/4 boundary');
});

Deno.test('isPrivateIp - public IPv4 addresses', () => {
  assertEquals(isPrivateIp('8.8.8.8'), false);
  assertEquals(isPrivateIp('1.1.1.1'), false);
  assertEquals(isPrivateIp('9.9.9.9'), false);
  assertEquals(isPrivateIp('203.0.113.1'), false);
});

Deno.test('isPrivateIp - IPv6 loopback', () => {
  assertEquals(isPrivateIp('::1'), true);
  assertEquals(isPrivateIp('0:0:0:0:0:0:0:1'), true);
});

Deno.test('isPrivateIp - IPv6 unique-local', () => {
  assertEquals(isPrivateIp('fc00::'), true, 'fc00::/7');
  assertEquals(isPrivateIp('fc00::1'), true, 'fc00::/7');
  assertEquals(isPrivateIp('fd00::1'), true, 'fc00::/7');
  assertEquals(isPrivateIp('fdff::1'), true, 'fc00::/7 boundary');
});

Deno.test('isPrivateIp - IPv6 link-local', () => {
  assertEquals(isPrivateIp('fe80::1'), true, 'fe80::/10');
  assertEquals(isPrivateIp('fe80::'), true, 'fe80::/10');
  assertEquals(isPrivateIp('febf::'), true, 'fe80::/10 boundary');
});

Deno.test('isPrivateIp - public IPv6 addresses', () => {
  assertEquals(isPrivateIp('2001:4860:4860::8888'), false);
  assertEquals(isPrivateIp('2606:4700:4700::1111'), false);
  assertEquals(isPrivateIp('2a00:1450:4000::1'), false);
});

// ---------------------------------------------------------------------------
// validatePushEndpoint — integration tests
// ---------------------------------------------------------------------------

Deno.test('validatePushEndpoint - invalid URL rejected', async () => {
  const result = await validatePushEndpoint('not-a-url');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Invalid URL');
});

Deno.test('validatePushEndpoint - empty string rejected', async () => {
  const result = await validatePushEndpoint('');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Invalid URL');
});

Deno.test('validatePushEndpoint - relative URL rejected', async () => {
  const result = await validatePushEndpoint('/relative/path');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Invalid URL');
});

Deno.test('validatePushEndpoint - http rejected by default', async () => {
  const result = await validatePushEndpoint('http://example.com/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'URL must use HTTPS protocol');
});

Deno.test('validatePushEndpoint - ftp protocol rejected', async () => {
  const result = await validatePushEndpoint('ftp://files.example.com/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'URL must use HTTP or HTTPS protocol');
});

Deno.test('validatePushEndpoint - localhost hostname rejected', async () => {
  const result = await validatePushEndpoint('https://localhost:8080/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Localhost hostname is not allowed');
});

Deno.test('validatePushEndpoint - IP literal 127.0.0.1 rejected', async () => {
  const result = await validatePushEndpoint('https://127.0.0.1:8080/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: 127.0.0.1');
});

Deno.test('validatePushEndpoint - IP literal ::1 rejected', async () => {
  const result = await validatePushEndpoint('https://[::1]:8080/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: ::1');
});

Deno.test('validatePushEndpoint - IP literal 10.0.0.1 rejected', async () => {
  const result = await validatePushEndpoint('https://10.0.0.1/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: 10.0.0.1');
});

Deno.test('validatePushEndpoint - IP literal 192.168.1.1 rejected', async () => {
  const result = await validatePushEndpoint('https://192.168.1.1/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: 192.168.1.1');
});

Deno.test('validatePushEndpoint - IP literal 172.16.0.1 rejected', async () => {
  const result = await validatePushEndpoint('https://172.16.0.1/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: 172.16.0.1');
});

Deno.test('validatePushEndpoint - IP literal fc00:: rejected', async () => {
  const result = await validatePushEndpoint('https://[fc00::1]:8080/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: fc00::1');
});

Deno.test('validatePushEndpoint - IP literal fe80:: rejected', async () => {
  const result = await validatePushEndpoint('https://[fe80::1]:8080/push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'Private or restricted IP range: fe80::1');
});

Deno.test('validatePushEndpoint - public IPv4 literal allowed', async () => {
  const result = await validatePushEndpoint('https://8.8.8.8/push');
  assertEquals(result.valid, true);
  assertEquals(result.resolvedHost, '8.8.8.8');
  assertEquals(result.resolvedIps, ['8.8.8.8']);
});

Deno.test('validatePushEndpoint - public IPv6 literal allowed', async () => {
  const result = await validatePushEndpoint(
    'https://[2001:4860:4860::8888]:8080/push',
  );
  assertEquals(result.valid, true);
  assertEquals(result.resolvedHost, '2001:4860:4860::8888');
  assertEquals(result.resolvedIps, ['2001:4860:4860::8888']);
});

// DNS-dependent tests are marked ignored because the project's test
// permissions config (deno.json) omits `net`, so DNS resolution is
// not available. Run manually with `--allow-net` to verify.
// e.g.: deno test -A -- --filter "ssrf" src/common/ssrf.validator.test.ts

Deno.test({
  name:
    'validatePushEndpoint - valid HTTPS URL resolves via DNS (requires net)',
  ignore: true,
  fn: async () => {
    const result = await validatePushEndpoint('https://up.ntfy.sh/test');
    assertEquals(result.valid, true);
    assertEquals(result.resolvedHost, 'up.ntfy.sh');
    assertEquals(Array.isArray(result.resolvedIps), true);
    assertEquals((result.resolvedIps?.length ?? 0) > 0, true);
  },
});

Deno.test({
  name:
    'validatePushEndpoint - nonexistent hostname fails DNS resolution (requires net)',
  ignore: true,
  fn: async () => {
    const result = await validatePushEndpoint(
      'https://this-domain-does-not-exist-12345xyz.com/push',
    );
    assertEquals(result.valid, false);
    assertEquals(result.reason, 'DNS resolution returned no addresses');
  },
});

Deno.test({
  name: 'validatePushEndpoint - http allowed when allowHttp is set',
  ignore: true,
  fn: async () => {
    const result = await validatePushEndpoint(
      'http://up.ntfy.sh/test',
      { allowHttp: true },
    );
    assertEquals(result.valid, true);
  },
});

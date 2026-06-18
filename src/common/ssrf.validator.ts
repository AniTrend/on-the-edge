/**
 * SSRF-safe validation for user-supplied push endpoint URLs.
 *
 * Rules:
 * 1. Must be HTTPS (except local dev allowlist)
 * 2. Hostname must resolve
 * 3. Reject localhost (127.0.0.1, ::1)
 * 4. Reject private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * 5. Reject loopback (127.0.0.0/8)
 * 6. Reject link-local (169.254.0.0/16)
 * 7. Reject IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
 * 8. Apply timeout for DNS resolution
 *
 * @module
 */

const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain'];

export interface SsrfValidationResult {
  valid: boolean;
  reason?: string;
  resolvedHost?: string;
  resolvedIps?: string[];
}

function parseIPv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return null;
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) |
    octets[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const val = parseIPv4(ip);
  if (val === null) return false;

  // 127.0.0.0/8 loopback
  if ((val >>> 24) === 127) return true;
  // 10.0.0.0/8
  if ((val >>> 24) === 10) return true;
  // 172.16.0.0/12
  if ((val >>> 20) === 0xAC1) return true;
  // 192.168.0.0/16
  if ((val >>> 16) === 0xC0A8) return true;
  // 169.254.0.0/16 link-local
  if ((val >>> 16) === 0xA9FE) return true;
  // 224.0.0.0/4 multicast
  if ((val >>> 28) === 0xE) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // ::1 loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  // Get the first 16-bit group to check prefix ranges
  const firstGroup = lower.replace(/^::/, '0').split(':')[0];

  // fc00::/7 unique-local (first group 0xfc00 - 0xfdff)
  if (firstGroup.startsWith('fc') || firstGroup.startsWith('fd')) return true;

  // fe80::/10 link-local (first group 0xfe80 - 0xfebf)
  if (
    firstGroup.startsWith('fe') && firstGroup.length >= 3 &&
    '89ab'.includes(firstGroup[2])
  ) return true;

  return false;
}

/**
 * Check if an IP address is in a private, loopback, link-local, or
 * multicast range.
 *
 * Supports both IPv4 and IPv6 addresses.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) return isPrivateIPv6(ip);
  return isPrivateIPv4(ip);
}

/**
 * Validate a push endpoint URL for SSRF safety.
 *
 * Parses the URL, checks protocol, resolves DNS (unless the hostname is
 * an IP literal), and validates all resolved IPs against private and
 * restricted ranges.
 *
 * @param url - The push endpoint URL to validate
 * @param options - Optional configuration
 * @param options.allowHttp - Allow HTTP URLs (for local dev only)
 * @param options.dnsTimeoutMs - Timeout for DNS resolution in ms
 * @returns Validation result
 */
export async function validatePushEndpoint(
  url: string,
  options?: {
    allowHttp?: boolean;
    dnsTimeoutMs?: number;
  },
): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL' };
  }

  const protocol = parsed.protocol;

  // Reject non-HTTP protocols first
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, reason: 'URL must use HTTP or HTTPS protocol' };
  }

  // Require HTTPS unless allowHttp is set (local dev only)
  if (protocol === 'http:' && !options?.allowHttp) {
    return { valid: false, reason: 'URL must use HTTPS protocol' };
  }

  const rawHostname = parsed.hostname;

  // Reject known blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(rawHostname.toLowerCase())) {
    return { valid: false, reason: 'Localhost hostname is not allowed' };
  }

  // Strip brackets from IPv6 literal hostnames
  const hostname = rawHostname.replace(/^\[|\]$/g, '');

  // Check if hostname is an IP literal (skip DNS)
  if (hostname.includes(':')) {
    // IPv6 literal
    if (isPrivateIPv6(hostname)) {
      return {
        valid: false,
        reason: `Private or restricted IP range: ${hostname}`,
      };
    }
    return {
      valid: true,
      resolvedHost: hostname,
      resolvedIps: [hostname],
    };
  }

  // IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return {
        valid: false,
        reason: `Private or restricted IP range: ${hostname}`,
      };
    }
    return {
      valid: true,
      resolvedHost: hostname,
      resolvedIps: [hostname],
    };
  }

  // Resolve DNS for hostname
  const timeoutMs = options?.dnsTimeoutMs ?? 5000;

  let aIps: string[] = [];
  let aaaaIps: string[] = [];

  try {
    const [aaaa, a] = await Promise.all([
      Deno.resolveDns(hostname, 'AAAA', {
        signal: AbortSignal.timeout(timeoutMs),
      }).catch(() => [] as string[]),
      Deno.resolveDns(hostname, 'A', {
        signal: AbortSignal.timeout(timeoutMs),
      }).catch(() => [] as string[]),
    ]);
    aaaaIps = aaaa;
    aIps = a;
  } catch {
    return { valid: false, reason: 'DNS resolution failed' };
  }

  const resolvedIps = [...aaaaIps, ...aIps];

  if (resolvedIps.length === 0) {
    return { valid: false, reason: 'DNS resolution returned no addresses' };
  }

  for (const ip of resolvedIps) {
    if (isPrivateIp(ip)) {
      return {
        valid: false,
        reason: `Resolved to private or restricted IP: ${ip}`,
      };
    }
  }

  return {
    valid: true,
    resolvedHost: hostname,
    resolvedIps,
  };
}

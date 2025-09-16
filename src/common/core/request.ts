import { between } from '@optic';
import { logger } from './logger.ts';

const sanitize = (uri: string): { safeUrl: string; host: string } => {
  const url = new URL(uri);

  const queryParams = url.searchParams;
  for (const key of queryParams.keys()) {
    if (key.includes('api_key') || key.includes('api_secret')) {
      queryParams.set(key, '********');
    }
  }

  return { safeUrl: url.toString(), host: url.host };
};

export const defaults: RequestInit = {
  method: 'GET',
  cache: 'default',
  headers: {
    'accept': 'application/json, application/xml, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'connection': 'keep-alive',
    'user-agent': `Deno/${Deno.version.deno}`,
  },
};

export const request = async <T>(
  url: string,
  options: RequestInit = defaults,
): Promise<T> => {
  logger.mark('request-start');
  const { safeUrl, host } = sanitize(url);
  logger.debug(`----> HTTP ${options.method}: ${safeUrl}`);

  let response: Response | undefined;
  try {
    response = await fetch(url, {
      headers: {
        ...options.headers,
        host: host,
      },
    });

    logger.debug(
      `<---- HTTP/${response.status} ${options.method}: ${safeUrl}`,
    );
    logger.mark('request-end');
    logger.measure(between('request-start', 'request-end'), host);

    const contentType = response.headers.get('Content-Type') ?? '';

    if (!response.ok) {
      // Consume the body to avoid Deno leak detector warnings; don't cancel a locked stream
      await response.arrayBuffer().catch(() => undefined);
      throw new Error(
        `<---- HTTP/${response.status} ${options.method}: ${safeUrl}`,
      );
    }

    if (contentType.includes('application/json')) {
      return await response.json() as T;
    } else {
      return await response.text() as unknown as T;
    }
  } catch (error) {
    logger.warn(error);
    // Preserve previous behavior: resolve to undefined on failure
    return undefined as unknown as T;
  }
};

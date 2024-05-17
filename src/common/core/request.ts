import { between } from 'x/optic';
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
  return await fetch(url, {
    headers: {
      ...options.headers,
      host: host,
    },
  }).then((response) => {
    logger.debug(`<---- HTTP/${response.status} ${options.method}: ${safeUrl}`);
    logger.mark('request-end');
    logger.measure(between('request-start', 'request-end'), host);
    if (!response.ok) {
      throw new Error(
        `<---- HTTP/${response.status} ${options.method}: ${safeUrl}`,
      );
    }
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }
  }).catch((error) => {
    logger.warn(error);
  });
};

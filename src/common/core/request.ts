import { between } from 'x/optic';
import { logger } from './logger.ts';

const sanitize = (url: string): string => {
  const urlObject = new URL(url);

  const queryParams = urlObject.searchParams;
  for (const key of queryParams.keys()) {
    if (key.includes('api_key') || key.includes('api_secret')) {
      queryParams.set(key, '********');
    }
  }

  return urlObject.toString();
};

export const defaults: RequestInit = {
  method: 'GET',
  cache: 'default',
  headers: {
    'accept': 'application/json, application/xml, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
  },
};

export const request = async <T>(
  url: string,
  options: RequestInit = defaults,
): Promise<T> => {
  const sanitizedUrl = sanitize(url);
  logger.debug(`----> ${options.method}: ${sanitizedUrl}`);
  logger.mark('request-start');
  return await fetch(url, options).then((response) => {
    logger.debug(`<---- ${response.status} ${options.method}: ${sanitizedUrl}`);
    logger.mark('request-end');
    logger.measure(between('request-start', 'request-end'), sanitizedUrl);
    if (!response.ok) {
      throw new Error(
        `<---- HTTP/${response.status} ${options.method}: ${sanitizedUrl}`,
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

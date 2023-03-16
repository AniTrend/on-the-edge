import { between } from 'x/optic';
import { logger } from './logger.ts';

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
  logger.debug(`----> ${options.method}: ${url}`);
  logger.mark('request-start');
  return await fetch(url, options).then((response) => {
    logger.debug(`<---- ${response.status} ${options.method}: ${url}`);
    logger.mark('request-end');
    logger.measure(between('request-start', 'request-end'), url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }
  }).catch((error) => {
    logger.warn(error.message, error);
  });
};

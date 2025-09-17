import { defaults, request } from '@scope/common/core';
import { Service } from '@scope/common/types';
import { env } from '@scope/common/core';

const getService = (): Service => ({
  url: env<string>('FEED'),
  credential: {},
});

export const latestNews = async (
  locale: string,
): Promise<string> => {
  const service = getService();
  const result = await request<string>(
    `${service.url}/${locale}/rss`,
    {
      ...defaults,
      headers: {
        ...defaults.headers,
        'content-type': 'application/xml',
      },
    },
  );

  return result;
};

import { defaults, request } from '../_shared/core/request.ts';
import { Service } from '../_shared/types/state.d.ts';
import { env } from '../_shared/core/env.ts';

const getService = (): Service => ({
  url: env<string>('FEED'),
  credential: {},
});

export const latestNews = async (
  searchParams: URLSearchParams,
): Promise<string> => {
  const service = getService();
  const result = await request<string>(
    `${service.url}/animenews?${searchParams}`,
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

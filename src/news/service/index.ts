import { defaults, request } from '../../common/core/request.ts';
import { Service } from '../../common/types/state.d.ts';
import { env } from '../../common/core/env.ts';

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

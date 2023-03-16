import { defaults, request } from '../_shared/core/request.ts';
import { Service } from '../_shared/types/state.d.ts';

export default class RemoteSource {
  constructor(private readonly service: Service) {}

  latestNews = async (
    searchParams: URLSearchParams,
  ): Promise<string> => {
    const result = await request<string>(
      `${this.service.url}/animenews?${searchParams}`,
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
}

import { Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { RssSchema } from './otakumode.schema.ts';
import { OtakumodeFeed } from './otakumode.types.ts';
import { parse } from '@libs/xml';
import { FeedSchema } from './types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable()
export class OtakumodeService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('FEED'),
      headers: {
        ...DEFAULT_HEADERS,
        'content-type': 'application/xml',
      },
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async rss(_locale: string): Promise<OtakumodeFeed> {
    return await this.client
      .get(`/news/feed`, { responseType: 'text' })
      .then(({ data }) => FeedSchema.safeParse(data))
      .then(({ data, error }) => {
        if (!error && data) {
          const xml = parse(data, { flatten: { attributes: true } });
          const { data: rssData, error: rssError } = RssSchema.safeParse(
            xml,
          );
          if (!rssError && rssData) {
            return rssData.rss.channel.item;
          }
          throw rssError;
        }
        throw error;
      })
      .catch((error) => {
        this.logger.instance.error(
          'Unable to fetch news feed from remote',
          error,
        );
        return undefined;
      });
  }
}

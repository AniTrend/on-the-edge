import { Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { ZodError } from 'zod';
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
  private readonly feedBaseUrl: string;
  private readonly requestTimeout: number;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    const baseURL = this.secret.get<string>('FEED');
    this.feedBaseUrl = baseURL;
    this.requestTimeout = this.secret.requestTimeout();
    this.client = createClient({
      baseURL,
      headers: {
        ...DEFAULT_HEADERS,
        'content-type': 'application/xml',
      },
      timeout: this.requestTimeout,
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async rss(_locale: string): Promise<OtakumodeFeed> {
    const requestContext = this.createRequestContext();
    if (!requestContext) {
      this.logger.instance.error(
        'Otakumode RSS feed configuration is invalid',
        {
          timeout: this.requestTimeout,
        },
      );
      return undefined;
    }

    this.logger.instance.info('Fetching OtakuMode RSS feed', requestContext);

    let payload: unknown;
    try {
      const response = await this.client.get('/news/feed', {
        responseType: 'text',
      });
      payload = response.data;
    } catch (error) {
      this.logger.instance.error(
        'OtakuMode RSS request failed',
        {
          ...requestContext,
          error: this.describeError(error),
        },
      );
      return undefined;
    }

    const feedResult = FeedSchema.safeParse(payload);
    if (!feedResult.success) {
      this.logger.instance.warn(
        'OtakuMode RSS payload validation failed',
        {
          ...requestContext,
          issues: this.formatIssues(feedResult.error),
        },
      );
      return undefined;
    }

    let xml: unknown;
    try {
      xml = parse(feedResult.data, { flatten: { attributes: true } });
    } catch (error) {
      this.logger.instance.warn(
        'OtakuMode RSS XML parse failed',
        {
          ...requestContext,
          error: this.describeError(error),
        },
      );
      return undefined;
    }

    const rssResult = RssSchema.safeParse(xml);
    if (!rssResult.success) {
      this.logger.instance.warn(
        'OtakuMode RSS schema validation failed',
        {
          ...requestContext,
          issues: this.formatIssues(rssResult.error),
        },
      );
      return undefined;
    }

    const items = rssResult.data.rss.channel.item;
    this.logger.instance.info(
      'Fetched OtakuMode RSS feed',
      {
        ...requestContext,
        itemCount: items.length,
      },
    );
    return items;
  }

  private createRequestContext(): {
    host: string;
    path: string;
    timeout: number;
  } | undefined {
    let requestUrl: URL;
    try {
      requestUrl = new URL('/news/feed', this.feedBaseUrl);
    } catch {
      return undefined;
    }

    return {
      host: requestUrl.host,
      path: requestUrl.pathname,
      timeout: this.requestTimeout,
    };
  }

  private formatIssues(error: ZodError): Array<{
    path: string;
    message: string;
  }> {
    return error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
    }));
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

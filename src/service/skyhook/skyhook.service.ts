import { Injectable, SCOPE } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { SkyhookModelSchema } from './skyhook.schema.ts';
import type { SkyhookShow } from './types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class SkyhookService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('SKYHOOK'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getShowByTvdb(tvdbId: number): Promise<SkyhookShow | undefined> {
    return await this.client
      .get(`/v1/tvdb/shows/en/${tvdbId}`)
      .then(({ data }) => SkyhookModelSchema.parse(data))
      .catch((error) => {
        this.logger.instance.warn(
          'Unable to get skyhook show from remote',
          error,
        );
        return undefined;
      });
  }
}

import { Injectable } from '@danet/core';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { DEFAULT_HEADERS } from '../constants.ts';
import { GithubVersionJsonSchema } from './github.schema.ts';
import type { GithubVersionJson } from './github.types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

/** Accept only https URLs; anything else is rejected before use. */
export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Reusable GitHub update source client. Fetches and validates the
 * version.json payload of any GitHub-hosted update source URL, so it
 * can serve every release channel without being coupled to a repo.
 */
@Injectable()
export class GithubService {
  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {}

  private createClient(sourceUrl: string): RequestClient {
    const client = createClient({
      baseURL: sourceUrl,
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    client.interceptors.request.use(requestInterceptor(this.logger));
    client.interceptors.response.use(responseInterceptor(this.logger));
    return client;
  }

  /**
   * Fetch and validate the version.json payload for a GitHub update
   * source. Returns undefined (with a warning) when the source is not
   * an https URL, is unreachable, or the payload does not match the
   * expected manifest shape.
   */
  async fetchVersionJson(
    sourceUrl: string,
  ): Promise<GithubVersionJson | undefined> {
    if (!isHttpsUrl(sourceUrl)) {
      this.logger.instance.warn(
        'Rejecting non-HTTPS update source URL',
        { sourceUrl },
      );
      return undefined;
    }
    try {
      const { data } = await this.createClient(sourceUrl).get('');
      return GithubVersionJsonSchema.parse(data);
    } catch (error) {
      this.logger.instance.warn(
        'Unable to fetch version.json from GitHub source',
        { sourceUrl, cause: error },
      );
      return undefined;
    }
  }
}

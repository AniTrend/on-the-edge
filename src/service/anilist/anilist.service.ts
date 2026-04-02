import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SecretService } from '@scope/secret';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import type { AniListMedia, AniListMediaType } from './anilist.types.ts';
import { AniListResponseSchema } from './anilist.schema.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

const MEDIA_BY_ID_QUERY = `
  query MediaById($id: Int!, $type: MediaType!) {
    Media(id: $id, type: $type) {
      id
      idMal
      type
      title {
        english
        romaji
        native
      }
    }
  }
`;

@Injectable()
export class AniListService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('ANILIST'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getMediaById(
    anilistId: number,
    mediaType: AniListMediaType,
  ): Promise<AniListMedia | undefined> {
    if (!anilistId) {
      return undefined;
    }

    try {
      const { data } = await this.client.post('/', {
        query: MEDIA_BY_ID_QUERY,
        variables: {
          id: anilistId,
          type: mediaType,
        },
      });

      const parsed = AniListResponseSchema.parse(data ?? {});
      const errors = parsed.errors ?? [];
      if (errors.length > 0) {
        this.logger.instance.warn('AniList GraphQL returned errors', {
          anilistId,
          mediaType,
          errors: errors.map((entry) => entry.message),
        });
      }

      return parsed.data?.Media ?? undefined;
    } catch (error) {
      this.logger.instance.warn('Unable to get AniList media from remote', {
        anilistId,
        mediaType,
        error: (error as Error).message,
      });
      return undefined;
    }
  }
}

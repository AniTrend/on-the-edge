import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SeriesRelationId, SeriesRelationSource } from './arm.types.ts';
import { SecretService } from '@scope/secret';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { ArmSchema, ArmSchemas } from './arm.schema.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable()
export class ArmService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('YUNA'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  getAniListRelationId = async (
    anilist: number,
  ): Promise<SeriesRelationId | undefined> => {
    const { data, status } = await this.client
      .get('/api/v2/ids', {
        params: {
          source: 'anilist',
          id: anilist,
        },
      });
    if (status !== 200) {
      this.logger.instance.error(
        `Unable to get ids for anilist from remote, status code: ${status}`,
        this.client,
      );
    }

    return ArmSchema.parse(data);
  };

  getRelationsById = async (
    source: SeriesRelationSource,
    id: number,
  ): Promise<SeriesRelationId> => {
    const { data, status } = await this.client
      .get('/api/v2/ids', {
        params: {
          source,
          id,
        },
      });
    if (status !== 200) {
      this.logger.instance.error(
        `Unable to get ids ${source} from remote, status code: ${status}`,
        this.client,
      );
    }

    return ArmSchema.parse(data);
  };

  getRelationsByTvdb = async (
    tvdb: number,
  ): Promise<SeriesRelationId[]> => {
    const { data, status } = await this.client
      .get('/api/v2/thetvdb', {
        params: {
          id: tvdb,
        },
      });
    if (status !== 200) {
      this.logger.instance.error(
        `Unable to get ids tvdb from remote, status code: ${status}`,
        this.client,
      );
    }

    return ArmSchemas.parse(data);
  };

  getRelationsByTmdb = async (
    tmdb: number,
  ): Promise<SeriesRelationId[]> => {
    const { data, status } = await this.client
      .get('/api/v2/themoviedb', {
        params: {
          id: tmdb,
        },
      });
    if (status !== 200) {
      this.logger.instance.error(
        `Unable to get ids tmdb from remote, status code: ${status}`,
        this.client,
      );
    }

    return ArmSchemas.parse(data);
  };

  getRelationsByImdb = async (
    imdb: number,
  ): Promise<SeriesRelationId[]> => {
    const { data, status } = await this.client
      .get('/api/v2/imdb', {
        params: {
          id: imdb,
        },
      });
    if (status !== 200) {
      this.logger.instance.error(
        `Unable to get ids imdb from remote, status code: ${status}`,
        this.client,
      );
    }

    return ArmSchemas.parse(data);
  };
}

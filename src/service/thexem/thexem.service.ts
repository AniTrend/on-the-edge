import { Inject, Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { type CacheService, TOKEN_CACHE_SERVICE } from '@scope/cache';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import {
  type TheXemRemoteEntry,
  TheXemResponseSchema,
} from './thexem.schema.ts';
import { TheXem, TheXemScene } from './types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable()
export class TheXemService {
  private readonly client: RequestClient;
  private readonly cacheTtlSeconds: number = 24 * 60 * 60;

  constructor(
    @Inject(TOKEN_CACHE_SERVICE) private readonly cache: CacheService,
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('THEXEM'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getMappingsByTvdb(tvdbId?: number): Promise<TheXem[]> {
    if (!tvdbId) {
      this.logger.instance.warn('The parameter `tvdbId` is undefined');
      return [];
    }

    const cached = await this.cache.get<TheXem[]>(
      `edge:thexem:mappings:${tvdbId}`,
    );
    if (cached) {
      return cached;
    }

    const mappings = await this.client
      .get('/map/all', { params: { origin: 'tvdb', id: tvdbId } })
      .then(({ data }) => TheXemResponseSchema.parse(data))
      .then((payload) => payload.data.map((entry) => this.mapEntry(entry)))
      .catch((error) => {
        this.logger.instance.warn(
          'Unable to get TheXem mappings from remote',
          error,
        );
        return [] as TheXem[];
      });

    this.cache.set<TheXem[]>(`edge:thexem:mappings:${tvdbId}`, mappings, {
      ttl: this.cacheTtlSeconds,
    });
    return mappings;
  }

  buildTvdbAbsoluteMap(rows: TheXem[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const row of rows) {
      const tvdbAbs = Number(row.tvdb.absolute);
      const absolute = Number(
        row.scene.absolute || row.anidb.absolute || row.tvdb.absolute,
      );
      if (
        Number.isFinite(tvdbAbs) && Number.isFinite(absolute) && tvdbAbs > 0 &&
        absolute > 0
      ) {
        if (!map.has(tvdbAbs)) {
          map.set(tvdbAbs, absolute);
        }
      }
    }
    return map;
  }

  buildTvdbSeasonEpisodeToAbsoluteMap(rows: TheXem[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      const season = Number(row.tvdb.season);
      const episode = Number(row.tvdb.episode);
      const absolute = Number(
        row.scene.absolute || row.anidb.absolute || row.tvdb.absolute,
      );
      if (
        Number.isFinite(season) && Number.isFinite(episode) &&
        Number.isFinite(absolute) && season >= 0 && episode > 0 &&
        absolute > 0
      ) {
        const key = `${season}-${episode}`;
        if (!map.has(key)) {
          map.set(key, absolute);
        }
      }
    }
    return map;
  }

  private mapEntry(entry: TheXemRemoteEntry): TheXem {
    return {
      scene: this.mapScene(entry.scene),
      tvdb: this.mapScene(entry.tvdb),
      anidb: this.mapScene(entry.anidb),
    };
  }

  private mapScene(
    scene: { season: number; episode: number; absolute: number },
  ): TheXemScene {
    return {
      season: Number(scene.season),
      episode: Number(scene.episode),
      absolute: Number(scene.absolute),
    };
  }
}

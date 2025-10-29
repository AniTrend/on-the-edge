import { Injectable, InternalServerErrorException } from '@danet/core';
import { BadRequestException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SeriesRepository } from './repository/index.ts';
import type { Series } from './series.types.ts';
import type { SeriesQuery } from './series.types.ts';

@Injectable()
export class SeriesService {
  constructor(
    private readonly repository: SeriesRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Aggregate series metadata from multiple sources
   *
   * Delegates to SeriesRepository for caching and aggregation,
   * then transforms the canonical SeriesDocument into the
   * legacy API response format.
   *
   * @param query Series query parameters
   * @returns Aggregated series response
   * @throws BadRequestException if query is empty or invalid
   * @throws NotFoundException if no upstream services return data
   */
  async aggregate(query: SeriesQuery): Promise<Series> {
    // Validate query has at least one identifier
    if (!query || Object.keys(query).length === 0) {
      this.logger.instance.warn('Provided empty query to aggregate series');
      throw new BadRequestException();
    }

    // Repository requires anilist ID; validate or derive it
    if (!query.anilist) {
      this.logger.instance.warn('AniList ID required for repository lookup', {
        query,
      });
      throw new BadRequestException();
    }

    try {
      const { _id, ...entity } = await this.repository.invoke(query);
      return {
        id: _id.toHexString(),
        ...entity,
      } satisfies Series;
    } catch (error) {
      this.logger.instance.error('Failed to aggregate series', {
        query,
        cause: error,
      });
      throw new InternalServerErrorException();
    }
  }
}

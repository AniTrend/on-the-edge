import { Injectable } from '@danet/core';
import { BadRequestException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { EpisodesRepository } from './repository/index.ts';
import type { EpisodeQuery, EpisodesContainer } from './episodes.types.ts';

/**
 * Episodes service handling API requests and delegating to repository.
 *
 * Architecture:
 * - Controller validates request parameters
 * - Service injects repository via DI
 * - Repository handles caching, pagination, and data fetching
 */
@Injectable()
export class EpisodeService {
  constructor(
    private readonly repository: EpisodesRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Fetch episodes with cursor-based pagination.
   *
   * @param query Query parameters (malId, limit, filters, cursors)
   * @returns Paginated episodes response
   */
  async getEpisodes(query: EpisodeQuery): Promise<EpisodesContainer> {
    const { malId, limit, after, before, kind, specialsOnly, start, end } =
      query;

    if (!malId) {
      this.logger.instance.warn('The `malId` parameter is required');
      throw new BadRequestException();
    }

    // Build filters from query parameters
    const filters = {
      kind,
      specialsOnly,
      start,
      end,
    };

    // Remove undefined filter values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined),
    );

    // Invoke repository with pagination options
    const result = await this.repository.invoke(malId, {
      limit: limit ?? 25,
      after,
      before,
      filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
    });

    return result;
  }
}

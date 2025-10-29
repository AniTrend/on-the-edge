import { Controller, Get } from '@danet/core';
import { Query, ReturnedSchema } from '@danet/zod';
import { EpisodeService } from './episodes.service.ts';
import { EpisodeSwagger } from './episodes.swagger.ts';
import { EpisodeQuerySchema } from './episodes.schema.ts';
import type { EpisodeQuery, EpisodesContainer } from './episodes.types.ts';

/**
 * Episodes API controller with cursor-based pagination.
 *
 * Example requests:
 * - GET /v1/episodes?malId=1535&limit=25
 * - GET /v1/episodes?malId=1535&limit=25&after=<cursor>
 * - GET /v1/episodes?malId=1535&kind=ova&specialsOnly=true
 * - GET /v1/episodes?malId=1535&start=5&end=12
 */
@Controller('v1')
export class EpisodeController {
  constructor(private readonly service: EpisodeService) {}

  @Get('episodes')
  @ReturnedSchema(EpisodeSwagger)
  async episodes(
    @Query(EpisodeQuerySchema) query: EpisodeQuery,
  ): Promise<EpisodesContainer> {
    return this.service.getEpisodes(query);
  }
}

import { Status } from '@oak';
import { AppContext, ErrorResponse } from '../common/types/core.ts';
import { EpisodesRepository } from './repository/episodes.repository.ts';
import { getAniListRelationId } from '../service/arm/index.ts';
import type { SeriesRelationId } from '../service/arm/types.ts';
import {
  clampLimit,
  parseBeforeCursor,
  parseCursor,
  parseFilters,
} from './episodes.params.ts';
import { collection } from '../common/mongo/collection.ts';
import { EpisodeLocalSource } from './collection/episode.collection.ts';
import type { EpisodeDocument } from './store/types.ts';
import SeriesLocalSource from '../series/local/series.local.source.ts';
import { logger } from '../common/core/logger.ts';

export const episodes = async (
  { request, response, state }: AppContext,
) => {
  const params = request.url.searchParams;
  const id = Number(params.get('id'));
  if (!id) {
    response.status = Status.BadRequest;
    response.body = <ErrorResponse> {
      message: "Missing required query parameter: 'id'",
    };
    return;
  }

  let relation: SeriesRelationId | undefined;
  try {
    const seriesSource = new SeriesLocalSource(
      collection('series', state.local),
    );
    relation = await seriesSource.getIds(id);
    if (relation?.myanimelist === undefined) {
      relation = await getAniListRelationId(id);
    }
  } catch (error) {
    logger.error('Failed to resolve series relation ID:', error);
    response.status = Status.UnprocessableEntity;
    response.body = <ErrorResponse> {
      message: "Failed to resolve series relation ID for provided 'id'",
    };
    return;
  }

  const after = parseCursor(params.get('after'));
  const before = parseBeforeCursor(params.get('before'));
  const limit = clampLimit(params.get('limit'));
  const filters = parseFilters(params);

  const localSource = new EpisodeLocalSource(
    collection<EpisodeDocument>('episodes', state.local),
  );
  const result = await new EpisodesRepository(
    localSource,
    state.features,
  ).invoke(id, {
    after,
    before,
    limit,
    filters,
    relation,
  });

  response.type = 'application/json';
  response.status = Status.OK;
  response.body = result;
};

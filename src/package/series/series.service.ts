import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@danet/core';
import { LoggerService } from '@scope/logger';
import { SeriesNotFoundError, SeriesRepository } from './repository/index.ts';
import type { Series } from './series.types.ts';
import type { SeriesQuery } from './series.types.ts';
import type { SeriesImageAttributes } from './series.types.ts';
import { selectSeriesImages } from './transformer/index.ts';

const selectAggregateImages = (
  images: SeriesImageAttributes[],
  locale?: string | null,
) => {
  const selectedImages = selectSeriesImages(images, locale);
  if (locale) {
    return selectedImages;
  }

  const selectedUrls = new Set(selectedImages.map(({ url }) => url));
  const fallbackTypes = new Set<SeriesImageAttributes['type']>();

  return [
    ...selectedImages,
    ...selectSeriesImages(
      images.filter(({ url }) => !selectedUrls.has(url)),
      'fallback',
    ).filter(({ type }) => {
      if (fallbackTypes.has(type)) {
        return false;
      }

      fallbackTypes.add(type);
      return true;
    }),
  ];
};

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
  async aggregate(query: SeriesQuery, locale?: string | null): Promise<Series> {
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
        images: selectAggregateImages(entity.images, locale),
      } satisfies Series;
    } catch (error) {
      if (error instanceof SeriesNotFoundError) {
        throw new NotFoundException();
      }

      this.logger.instance.error('Failed to aggregate series', {
        query,
        cause: error,
      });
      throw new InternalServerErrorException();
    }
  }
}

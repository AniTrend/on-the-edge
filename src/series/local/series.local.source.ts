import {
  Collection,
  Document,
  Filter,
  FindOneAndReplaceOptions,
} from '@mongodb';
import { logger } from '../../common/core/logger.ts';
import { IResponse } from '../../common/types/response.ts';
import { MediaEntity, MediaUnion } from '../types.ts';
import { transform } from './series.local.transformer.ts';
import { MediaDocument } from './types.ts';
import { MediaParamId } from './types.ts';
import { FindOptions } from '@mongodb';
import { between } from '@optic';
import { SeriesRelationId } from '../../service/arm/types.ts';

export default class LocalSource {
  constructor(
    private readonly collection?: Collection<MediaDocument>,
  ) {}

  get = async (mediaId: MediaParamId): Promise<IResponse<MediaEntity>> => {
    const filter: Filter<Document> = {
      'mediaId.anilist': mediaId.anilist,
    };
    const options: FindOptions<MediaDocument> = {};
    logger.mark('series_source_get_start');
    const document = await this.collection
      ?.findOne(filter, options)
      ?.then((document) => {
        logger.debug(
          `seriese.local.source:get: Result from collection lookup`,
          document?._id,
        );
        logger.mark('series_source_get_end');
        return document;
      })
      ?.catch((e) => {
        logger.warn(
          `seriese.local.source:get: Unable to find media in collection`,
          [mediaId, e],
        );
        return undefined;
      })
      ?.finally(() => {
        logger.measure(
          between('series_source_get_start', 'series_source_get_end'),
        );
      });

    return {
      data: transform(document) ?? null,
    };
  };

  getIds = async (anilist: number): Promise<SeriesRelationId | undefined> => {
    const filter: Filter<Document> = {
      'mediaId.anilist': anilist,
    };
    const options: FindOptions<MediaDocument> = {
      projection: { mediaId: 1 },
    };
    const document = await this.collection
      ?.findOne(filter, options)
      ?.then((document) => {
        logger.debug(
          `seriese.local.source:getIds: Result from collection lookup`,
          document?._id,
        );
        return document;
      })
      ?.catch((e) => {
        logger.warn(
          `seriese.local.source:getIds: Unable to find media in collection`,
          [anilist, e],
        );
        return undefined;
      });

    return document
      ? {
        anidb: document.mediaId.anidb ?? undefined,
        anilist: document.mediaId.anilist ?? undefined,
        animePlanet: document.mediaId.animePlanet ?? undefined,
        anisearch: document.mediaId.anisearch ?? undefined,
        imdb: document.mediaId.imdb ?? undefined,
        kitsu: document.mediaId.kitsu ?? undefined,
        livechart: document.mediaId.livechart ?? undefined,
        notify: document.mediaId.notify ?? undefined,
        themoviedb: document.mediaId.themoviedb ?? undefined,
        thetvdb: document.mediaId.tvdb ?? undefined,
        myanimelist: document.mediaId.myanimelist ?? undefined,
      }
      : undefined;
  };

  save = async (media: MediaUnion): Promise<IResponse<MediaEntity>> => {
    if (!this.collection) {
      logger.error('seriese.local.source:save: Collection is not initialized');
      throw new Error('Collection not initialized');
    }

    const filter: Filter<Document> = {
      'mediaId.anilist': media.mediaId.anilist,
    };
    const options: FindOneAndReplaceOptions = {
      upsert: true,
      returnDocument: 'after',
    };
    const replacement: MediaDocument = {
      ...media,
    };

    logger.mark('series_source_save_start');
    try {
      const document = await this.collection.findOneAndReplace(
        filter,
        replacement,
        options,
      );
      logger.mark('series_source_save_end');
      logger.measure(
        between('series_source_save_start', 'series_source_save_end'),
      );
      logger.debug(
        'seriese.local.source:save: Document saved or updated',
        document?._id,
      );
      if (!document) {
        // This should ideally not be reached if upsert:true and returnDocument:'after' work as expected
        logger.error(
          'seriese.local.source:save: Save operation did not return a document despite upsert and returnDocument:after',
          filter,
        );
        throw new Error(
          'Save operation unexpectedly failed to return document',
        );
      }
      logger.debug('seriese.local.source:save: Saved document', document._id);
      return {
        data: transform(document) ?? null,
      };
    } catch (e) {
      logger.error(
        'seriese.local.source:save: Unable to save collection',
        { filter, error: e instanceof Error ? e.message : String(e) },
      );
      throw new Error(
        `Failed to save media: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };
}

import {
  Collection,
  Document,
  Filter,
  FindOneAndReplaceOptions,
} from 'npm/mongodb';
import { logger } from '../../common/core/logger.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { MediaWithSeason } from '../types.d.ts';
import { transform } from './transformer.ts';
import { MediaDocument } from './types.d.ts';
import { MediaParamId } from './types.d.ts';
import { FindOptions } from 'npm/mongodb';
import { between } from 'x/optic';

export default class LocalSource {
  constructor(
    private readonly collection?: Collection<MediaDocument>,
  ) {}

  get = async (mediaId: MediaParamId): Promise<IResponse<MediaWithSeason>> => {
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

  save = async (media: MediaWithSeason) => {
    const filter: Filter<Document> = {
      'mediaId.anilist': media.mediaId.anilist,
    };
    const options: FindOneAndReplaceOptions = {
      upsert: true,
    };
    const replacement: MediaDocument = {
      ...media,
    };

    logger.mark('series_source_save_start');
    await this.collection?.findOneAndReplace(filter, replacement, options)
      ?.then((result) => {
        logger.debug('seriese.local.source:save: Saved document', result?._id);
        logger.mark('series_source_save_end');
      })?.catch((e) => {
        logger.error(
          'seriese.local.source:save: Unable to save collection',
          [filter, e],
        );
      })?.finally(() => {
        logger.measure(
          between('series_source_save_start', 'series_source_save_end'),
        );
      });
  };
}

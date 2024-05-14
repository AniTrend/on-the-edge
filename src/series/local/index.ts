import { Collection, Document, Filter, FindAndModifyOptions } from 'x/mongo';
import { logger } from '../../common/core/logger.ts';
import { IResponse } from '../../common/types/response.d.ts';
import { MediaWithSeason } from '../types.d.ts';
import { transform } from './transformer.ts';

export default class LocalSource {
  constructor(
    private readonly collection?: Collection<Document>,
  ) {}

  get = async (id: number): Promise<IResponse<MediaWithSeason>> => {
    const item = await this.collection
      ?.findOne({ 'mediaId.anilist': id })
      ?.then((document) => transform(document))
      ?.catch((e) => {
        logger.error(
          `seriese.local.index.LocalSource:get: Unable to find '${id}' in collection`,
          e,
        );
        return undefined;
      });

    return {
      data: item ?? null,
    };
  };

  save = async (media: MediaWithSeason) => {
    const filter: Filter<Document> = {
      'mediaId.anilist': media.mediaId.anilist,
    };
    const options: FindAndModifyOptions<Document> = {
      upsert: true,
      update: media,
    };
    await this.collection?.findAndModify(filter, options).then((result) => {
      logger.debug('seriese.local.index.LocalSource:save: ObjectId', result);
    }).catch((e) => {
      logger.error(
        'seriese.local.index.LocalSource:save: Unable to save media to collection',
        e,
      );
    });
  };
}

import { Collection, Document } from 'x/mongo';
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
      ?.then((document) => {
        if (!document) {
          return undefined;
        }
        return transform(document);
      })
      ?.catch((e) => {
        logger.error(`Unable to find '${id}' in collection`, e);
        return undefined;
      });

    return {
      data: item ?? null,
    };
  };

  save = async (media: MediaWithSeason) => {
    await this.collection?.insertOne(
      { ...media },
    ).then((result) => {
      logger.debug('ObjectId', result);
    }).catch((e) => {
      logger.error('Unable to save media to collection', e);
      return undefined;
    });
  };
}

import type {
  Collection,
  Document,
  Filter,
  FindOneAndReplaceOptions,
} from '@mongodb';
import { between } from '@optic';
import type { EpisodeDocument } from '../store/types.ts';
import { logger } from '@scope/common/core';
import { Instant } from '@scope/common/helpers';

export interface EpisodeCollection {
  lastUpdated(seriesKey: string): Promise<Instant | null>;
  get(seriesKey: string): Promise<EpisodeDocument | null>;
  save(doc: EpisodeDocument): Promise<EpisodeDocument>;
}

export class EpisodeLocalSource implements EpisodeCollection {
  constructor(
    private readonly collection?: Collection<EpisodeDocument>,
  ) {}

  async lastUpdated(seriesKey: string): Promise<Instant | null> {
    if (!this.collection) return null;
    const filter: Filter<Document> = { seriesKey };
    return await this.collection.findOne(
      filter,
      { projection: { updatedAt: 1 } },
    ).then((doc) => doc?.updatedAt ?? null);
  }

  async get(seriesKey: string): Promise<EpisodeDocument | null> {
    if (!this.collection) return null;
    const filter: Filter<Document> = { seriesKey };
    const markStart = 'episode_collection_get_start';
    const markEnd = 'episode_collection_get_end';
    logger.mark(markStart);
    try {
      const document = await this.collection.findOne(filter);
      logger.debug('episode.collection:get: findOne', document?._id);
      return document ?? null;
    } catch (e) {
      logger.warn('episode.collection:get: findOne failed', {
        seriesKey,
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    } finally {
      logger.mark(markEnd);
      logger.measure(between(markStart, markEnd));
    }
  }

  async save(doc: EpisodeDocument): Promise<EpisodeDocument> {
    if (!this.collection) {
      logger.error('episode.collection:save: Collection is not initialized');
      throw new Error('Collection not initialized');
    }
    const filter: Filter<Document> = { seriesKey: doc.seriesKey };
    const options: FindOneAndReplaceOptions = {
      upsert: true,
      returnDocument: 'after',
    };
    const markStart = 'episode_collection_save_start';
    const markEnd = 'episode_collection_save_end';
    logger.mark(markStart);
    try {
      const result = await this.collection.findOneAndReplace(
        filter,
        doc,
        options,
      );
      logger.debug('episode.collection:save: findOneAndReplace', result?._id);
      if (!result) throw new Error('Save returned null document');
      return result as EpisodeDocument;
    } catch (e) {
      logger.error('episode.collection:save failed', {
        seriesKey: doc.seriesKey,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e instanceof Error ? e : new Error(String(e));
    } finally {
      logger.mark(markEnd);
      logger.measure(between(markStart, markEnd));
    }
  }
}

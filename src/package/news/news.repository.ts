import { Injectable } from '@danet/core';
import { MongoService, type Project, type Sorting } from '@scope/database';
import { NewsDocument, NewsDocumentWithId } from './news.document.ts';
import { News, NewsPaging, NewsPagingQuery, NewsQuery } from './news.types.ts';
import { NewsSchema } from './news.schema.ts';
import { Filter, FindOptions, ObjectId } from 'mongodb';
import { OtakumodeService } from '@scope/service/otakumode';
import { transform } from './news.transformer.ts';
import { LoggerService } from '@scope/logger';
import { Collection, MongoCollectionAdapter } from '@scope/database/collection';

@Injectable()
export class NewsRepository {
  private readonly COLLECTION_NAME = 'news';
  private readonly CACHE_THRESHOLD_HOURS = 12;
  private readonly collection: Collection<NewsDocument>;
  constructor(
    private readonly mongo: MongoService,
    private readonly service: OtakumodeService,
    private readonly logger: LoggerService,
  ) {
    this.collection = new MongoCollectionAdapter(
      this.mongo.collection<NewsDocument>(this.COLLECTION_NAME),
    );
  }

  private toPublicNews(document: NewsDocumentWithId): {
    cursor: string;
    item: News;
  } | undefined {
    const parsed = NewsSchema.safeParse({
      id: document.id,
      title: document.title,
      link: document.link,
      description: document.description,
      content: document.content,
      category: document.category,
      genre: document.genre,
      area: document.area,
      lang: document.lang,
      publishedOn: document.publishedOn,
      image: document.image,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => {
        const path = issue.path.join('.') || 'root';
        return `${path}: ${issue.message}`;
      }).join('; ');
      this.logger.instance.warn(
        `Dropping invalid cached news document ${document._id.toHexString()}: ${issues}`,
      );
      return undefined;
    }

    return {
      cursor: document._id.toHexString(),
      item: parsed.data,
    };
  }

  private async toPublicNewsBatch(
    documents: NewsDocumentWithId[],
  ): Promise<
    Array<{
      cursor: string;
      item: News;
    }>
  > {
    const invalidDocumentIds: ObjectId[] = [];
    const payload = documents.flatMap((document) => {
      const parsed = this.toPublicNews(document);
      if (parsed) {
        return [parsed];
      }

      invalidDocumentIds.push(document._id);
      return [];
    });

    if (invalidDocumentIds.length > 0) {
      await this.collection.deleteMany({
        _id: { $in: invalidDocumentIds },
      });
    }

    return payload;
  }

  async lastUpdatedAt(): Promise<number | undefined> {
    const projection: Project<NewsDocumentWithId> = { updatedAt: 1 };
    const sort: Sorting<NewsDocumentWithId> = { updatedAt: 'desc' };
    const { updatedAt } = await this.collection.findOne(
      { _id: { $exists: true } },
      { projection, sort, limit: 1 },
    )?.then((doc) => doc ?? { updatedAt: undefined });
    return updatedAt;
  }

  async feed(query: NewsQuery): Promise<News[]> {
    const cacheDecision = await this.readCachedFeed();
    if (cacheDecision.kind === 'cached') {
      return cacheDecision.payload;
    }

    this.logger.instance.info('Fetching news feed from RSS source');
    const model = await this.service.rss(query.locale);
    if (model === undefined) {
      this.logger.instance.warn('RSS fetch returned undefined', {
        locale: query.locale,
      });
      if (cacheDecision.kind === 'validation-fallthrough') {
        this.logger.instance.warn(
          'Cached news payload validation fell through to RSS, and RSS fetch also failed',
          { locale: query.locale },
        );
      }
      return [];
    }

    this.logger.instance.info('RSS fetch returned news items', {
      locale: query.locale,
      itemCount: model.length,
    });

    const documents = transform(model);
    if (documents.length !== model.length) {
      this.logger.instance.warn(
        `Dropped ${
          model.length - documents.length
        } RSS news items with invalid publishedOn values`,
      );
    }

    if (documents.length === 0) {
      this.logger.instance.info(
        'No transformed news items available for insert',
        {
          locale: query.locale,
          sourceItemCount: model.length,
          insertedCount: 0,
        },
      );
      return [];
    }

    const { insertedCount } = await this.collection.insertMany(documents);
    this.logger.instance.info('Inserted news items from RSS', {
      locale: query.locale,
      sourceItemCount: model.length,
      insertedCount,
    });
    return [...documents];
  }

  private async readCachedFeed(): Promise<
    | { kind: 'missing' | 'stale' | 'validation-fallthrough' }
    | { kind: 'cached'; payload: News[] }
  > {
    const updatedAt = await this.lastUpdatedAt();
    if (!updatedAt) {
      this.logger.instance.info(
        'News feed cache has no latest timestamp; using RSS',
      );
      return { kind: 'missing' };
    }

    const publishedInstant = Temporal.Instant.fromEpochMilliseconds(updatedAt);
    const elapsed = publishedInstant.until(Temporal.Now.instant(), {
      largestUnit: 'hours',
    });
    const cacheAgeHours = elapsed.hours;
    this.logger.instance.info('Evaluated cached news feed timestamp', {
      updatedAt,
      cacheAgeHours,
      thresholdHours: this.CACHE_THRESHOLD_HOURS,
    });

    if (cacheAgeHours >= this.CACHE_THRESHOLD_HOURS) {
      this.logger.instance.info('Cached news feed is stale; using RSS', {
        updatedAt,
        cacheAgeHours,
        thresholdHours: this.CACHE_THRESHOLD_HOURS,
      });
      return { kind: 'stale' };
    }

    const sort: Sorting<NewsDocumentWithId> = { updatedAt: 'desc' };
    const options: FindOptions<NewsDocumentWithId> = {
      sort,
      limit: 15,
    };
    const results = await this.collection.find({}, options);
    const payload = (await this.toPublicNewsBatch(results)).map(({ item }) =>
      item
    );

    if (payload.length > 0 || results.length === 0) {
      this.logger.instance.info('Returning cached news feed from database', {
        updatedAt,
        cacheAgeHours,
        cachedDocumentCount: results.length,
        returnedItemCount: payload.length,
      });
      return { kind: 'cached', payload };
    }

    this.logger.instance.warn(
      'Cached news payload failed schema validation; falling through to RSS',
      {
        updatedAt,
        cacheAgeHours,
        cachedDocumentCount: results.length,
        returnedItemCount: payload.length,
      },
    );
    return { kind: 'validation-fallthrough' };
  }

  async paging(query: NewsPagingQuery): Promise<NewsPaging> {
    const filter: Filter<NewsDocumentWithId> = {};
    const sort: Sorting<NewsDocumentWithId> = {
      publishedOn: 'desc',
      _id: 'desc',
    };
    if (query?.before) {
      filter._id = { $lt: new ObjectId(query.before) };
    } else if (query?.after) {
      filter._id = { $gt: new ObjectId(query.after) };
    }

    const documents = await this.collection.find(
      filter,
      { sort, limit: query.limit },
    );

    const payload = await this.toPublicNewsBatch(documents);
    const data = payload.map(({ item }) => item);

    const count = data.length;
    let first, last: string | undefined = undefined;

    if (count > 0) {
      first = payload[0].cursor;
      last = payload[count - 1].cursor;
    }

    return { count, data, first, last };
  }
}

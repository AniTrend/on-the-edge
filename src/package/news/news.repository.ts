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

  private toPublicNewsBatch(documents: NewsDocumentWithId[]): Array<{
    cursor: string;
    item: News;
  }> {
    return documents.flatMap((document) => {
      const parsed = this.toPublicNews(document);
      return parsed ? [parsed] : [];
    });
  }

  async lastUpdatedAt(): Promise<number | undefined> {
    const projection: Project<NewsDocumentWithId> = { updatedAt: 1 };
    const sort: Sorting<NewsDocumentWithId> = { updatedAt: 'desc' };
    const { updatedAt } = await this.collection.findOne(
      { _id: { $exists: true } },
      { projection, sort, limit: 1 },
    )?.then((doc) => doc ?? { updatedAt: undefined });
    this.logger.instance.debug(
      `Last updatedAt timestamp: ${updatedAt}`,
    );
    return updatedAt;
  }

  async feed(query: NewsQuery): Promise<News[]> {
    const updatedAt = await this.lastUpdatedAt();

    if (updatedAt) {
      const publishedInstant = Temporal.Instant.fromEpochMilliseconds(
        updatedAt,
      );
      const result = Temporal.Now.instant().until(publishedInstant, {
        largestUnit: 'hours',
      });
      this.logger.instance.debug(
        `Time elapsed result: ${result.hours} hours (12h threshold)`,
      );

      if (result.hours < 12) {
        this.logger.instance.debug('Using cached feed from database');
        const sort: Sorting<NewsDocumentWithId> = { updatedAt: 'desc' };
        const options: FindOptions<NewsDocumentWithId> = {
          sort,
          limit: 15,
        };
        const results = await this.collection.find({}, options);
        const payload = this.toPublicNewsBatch(results).map(({ item }) => item);
        if (payload.length > 0 || results.length === 0) {
          return payload;
        }

        this.logger.instance.warn(
          'Cached news payload failed schema validation; fetching fresh RSS feed',
        );
      }
    }

    this.logger.instance.debug('Fetching new RSS feed from remote source');
    const model = await this.service.rss(query.locale);
    if (model) {
      const documents = transform(model);
      if (documents.length !== model.length) {
        this.logger.instance.warn(
          `Dropped ${
            model.length - documents.length
          } RSS news items with invalid publishedOn values`,
        );
      }
      const { insertedCount } = await this.collection.insertMany(documents);
      this.logger.instance.debug(
        `Inserted ${insertedCount} news items`,
      );
      return documents.map((doc) => {
        return doc;
      });
    }
    this.logger.instance.warn('No news items fetched from RSS');
    return [];
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

    const payload = this.toPublicNewsBatch(documents);
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

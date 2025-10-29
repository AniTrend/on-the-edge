import { Injectable, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { Collection, Document, MongoClient } from 'mongodb';
import { between } from '@onjara/optic';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { IDatabaseService } from './database.interface.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class MongoService
  implements IDatabaseService, OnAppBootstrap, OnAppClose {
  private readonly client: MongoClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    const url = this.secret.get<string>('MONGO_URL');
    this.client = new MongoClient(url);
  }

  collection<T extends Document>(name: string): Collection<T> {
    return this.client.db().collection<T>(name, { checkKeys: true });
  }

  async onAppBootstrap(): Promise<void> {
    this.logger.instance.mark('mongodb-connect-start');
    await this.client.connect();
    this.logger.instance.mark('mongodb-connect-end');
    this.logger.instance.measure(
      between('mongodb-connect-start', 'mongodb-connect-end'),
    );
  }

  async onAppClose(): Promise<void> {
    this.logger.instance.mark('mongodb-close-start');
    await this.client.close();
    this.logger.instance.mark('mongodb-close-end');
    this.logger.instance.measure(
      between('mongodb-close-start', 'mongodb-close-end'),
    );
  }
}

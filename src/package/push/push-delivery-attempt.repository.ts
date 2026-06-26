import { Injectable } from '@danet/core';
import { MongoService } from '@scope/database';
import { LoggerService } from '@scope/logger';
import { Collection, MongoCollectionAdapter } from '@scope/database/collection';

/**
 * MongoDB document shape for push delivery attempts.
 *
 * Records every push notification delivery outcome for
 * observability and debugging.
 */
export interface PushDeliveryAttemptDocument {
  installationId: string;
  instance: string;
  endpointHash: string;
  type: string;
  id: string;
  success: boolean;
  gone: boolean;
  statusCode?: number;
  error?: string;
  latencyMs: number;
  attemptedAt: Date;
}

const COLLECTION_NAME = 'push_delivery_attempts';

@Injectable()
export class PushDeliveryAttemptRepository {
  private readonly collection: Collection<PushDeliveryAttemptDocument>;

  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
  ) {
    this.collection = new MongoCollectionAdapter(
      this.mongo.collection<PushDeliveryAttemptDocument>(COLLECTION_NAME),
    );
  }

  /**
   * Record a delivery attempt.
   *
   * Fire-and-forget: callers should not await this or
   * throw on persistence failures.
   */
  async insert(doc: PushDeliveryAttemptDocument): Promise<void> {
    await this.collection.insertMany([doc]);
  }

  /**
   * Get recent delivery attempts for an installation.
   *
   * Useful for debugging and observability of push delivery.
   */
  async findByInstallation(
    installationId: string,
    limit = 20,
  ): Promise<PushDeliveryAttemptDocument[]> {
    const docs = await this.collection.find(
      { installationId },
      { sort: { attemptedAt: -1 }, limit },
    );
    return docs;
  }
}

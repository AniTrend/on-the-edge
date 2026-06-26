import { Injectable } from '@danet/core';
import { OnAppBootstrap } from '@danet/core/hook';
import { MongoService } from './mongo.service.ts';
import { LoggerService } from '@scope/logger';

/**
 * Creates and ensures MongoDB indexes for push-related collections.
 *
 * Indexes are created on application bootstrap. MongoDB's createIndex
 * is idempotent — calling it on an already-indexed field is a no-op.
 *
 * Collection names here MUST match the names used in PushRepository
 * and related services.
 *
 * TODO(#378): generalise to a collection-level index descriptor pattern
 * if more collections need programmatic indexing.
 */

const PUSH_INSTALLATIONS = 'push_installations';
const PUSH_DELIVERY_ATTEMPTS = 'push_delivery_attempts';

@Injectable()
export class DatabaseIndexService implements OnAppBootstrap {
  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
  ) {}

  async onAppBootstrap(): Promise<void> {
    try {
      await this.createPushInstallationIndexes();
      await this.createPushDeliveryAttemptIndexes();
    } catch (error) {
      this.logger.instance.warn(
        'Failed to create database indexes during bootstrap',
        { cause: error },
      );
    }
  }

  private async createPushInstallationIndexes(): Promise<void> {
    const collection = this.mongo.collection(PUSH_INSTALLATIONS);

    try {
      // Unique compound index on (installationId, instance)
      await collection.createIndex(
        { installationId: 1, instance: 1 },
        { unique: true, name: 'idx_installation_instance' },
      );

      // Unique index on endpoint
      await collection.createIndex(
        { endpoint: 1 },
        { unique: true, name: 'idx_endpoint' },
      );

      // Status index for querying active/disabled/expired installations
      await collection.createIndex(
        { status: 1 },
        { name: 'idx_status' },
      );

      // Compound index for topic-based fan-out queries
      await collection.createIndex(
        { 'topics.news': 1, status: 1 },
        { name: 'idx_topics_news_status' },
      );
      await collection.createIndex(
        { 'topics.appAnnouncements': 1, status: 1 },
        { name: 'idx_topics_app_announcements_status' },
      );
      await collection.createIndex(
        { 'topics.sync': 1, status: 1 },
        { name: 'idx_topics_sync_status' },
      );

      // Index for client-declared AniList user id queries
      await collection.createIndex(
        { anilistUserId: 1, identityState: 1 },
        { name: 'idx_anilist_user_identity' },
      );

      // TTL index for pending challenge expiration
      await collection.createIndex(
        { 'challenge.expiresAt': 1 },
        { expireAfterSeconds: 0, name: 'idx_challenge_ttl' },
      );

      this.logger.instance.debug(
        `Created indexes on ${PUSH_INSTALLATIONS}`,
      );
    } catch (error) {
      this.logger.instance.warn(
        `Failed to create indexes on ${PUSH_INSTALLATIONS}`,
        { cause: error },
      );
    }
  }

  private async createPushDeliveryAttemptIndexes(): Promise<void> {
    const collection = this.mongo.collection(PUSH_DELIVERY_ATTEMPTS);

    try {
      // Compound index for querying delivery attempts per installation
      await collection.createIndex(
        { installationId: 1, attemptedAt: -1 },
        { name: 'idx_installation_attempted' },
      );

      // TTL index for automatic cleanup of old delivery attempts (90 days)
      await collection.createIndex(
        { attemptedAt: 1 },
        { expireAfterSeconds: 7776000, name: 'idx_attempted_ttl' },
      );

      this.logger.instance.debug(
        `Created indexes on ${PUSH_DELIVERY_ATTEMPTS}`,
      );
    } catch (error) {
      this.logger.instance.warn(
        `Failed to create indexes on ${PUSH_DELIVERY_ATTEMPTS}`,
        { cause: error },
      );
    }
  }
}

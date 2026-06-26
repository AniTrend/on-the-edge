import { Injectable } from '@danet/core';
import { MongoService } from '@scope/database';
import { LoggerService } from '@scope/logger';
import { Collection, MongoCollectionAdapter } from '@scope/database/collection';
import { Filter, WithId } from 'mongodb';

/**
 * MongoDB document shape for push installations.
 */
export interface PushInstallationDocument {
  installationId: string;
  instance: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  status: 'pending' | 'active' | 'disabled' | 'expired' | 'revoked';
  anilistUserId?: number;
  identityState?: 'anonymous' | 'client-declared';
  platform: 'android';
  distributor?: string;
  app?: {
    version?: string;
    code?: number;
    build?: string;
    source?: string;
  };
  device?: {
    sdk?: number;
    manufacturer?: string;
    model?: string;
  };
  locale?: {
    language?: string;
    region?: string;
    timezone?: string;
  };
  capabilities?: {
    unifiedPush?: boolean;
    notificationRuntimePermission?: boolean;
    supportsSilentSync?: boolean;
    supportsRichNotifications?: boolean;
  };
  topics?: {
    news?: boolean;
    appAnnouncements?: boolean;
    sync?: boolean;
    airing?: boolean;
    mediaUpdates?: boolean;
  };
  lastView?: {
    name: string;
    version?: number;
    seenAt: number;
  };
  challenge?: {
    tokenHash: string;
    expiresAt: Date;
    attempts: number;
  };
  lastProfileSyncAt?: number;
  lastConfirmedAt?: number;
  lastDeliveredAt?: number;
  lastFailedAt?: number;
  failureCount: number;
  createdAt: number;
  updatedAt: number;
}

export type PushInstallationWithId = WithId<PushInstallationDocument>;

/**
 * Topic names supported for fan-out queries.
 */
export type PushTopic =
  | 'news'
  | 'appAnnouncements'
  | 'sync';

const COLLECTION_NAME = 'push_installations';

@Injectable()
export class PushRepository {
  private readonly collection: Collection<PushInstallationDocument>;

  constructor(
    private readonly mongo: MongoService,
    private readonly logger: LoggerService,
  ) {
    this.collection = new MongoCollectionAdapter(
      this.mongo.collection<PushInstallationDocument>(COLLECTION_NAME),
    );
  }

  // --- Query helpers ---

  private filterById(
    installationId: string,
    instance: string,
  ): Filter<PushInstallationDocument> {
    return { installationId, instance };
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  // --- CRUD ---

  /**
   * Upsert an installation document by installationId + instance.
   * Returns the document after upsert, plus whether it was newly created
   * and the previous document (if it existed).
   */
  async upsert(
    doc: PushInstallationDocument,
  ): Promise<{
    doc: PushInstallationWithId;
    wasCreated: boolean;
    previous?: PushInstallationWithId;
  }> {
    const now = this.nowSeconds();
    const replacement = {
      ...doc,
      updatedAt: now,
    };

    // Check existence first to distinguish insert vs update.
    // Race window exists between findOne and findOneAndReplace,
    // but since wasCreated is only used for observability, an
    // occasional miscategorization is acceptable.
    const existed = await this.collection.findOne(
      this.filterById(doc.installationId, doc.instance),
    );

    const result = await this.collection.findOneAndReplace(
      this.filterById(doc.installationId, doc.instance),
      replacement,
      { upsert: true, returnDocument: 'after' },
    );

    this.logger.instance.debug(
      `Upserted push installation ${doc.installationId}/${doc.instance}`,
      { status: doc.status },
    );

    return {
      doc: result!,
      wasCreated: existed === null,
      previous: existed ?? undefined,
    };
  }

  /**
   * Find an installation by installationId and instance.
   */
  async findById(
    installationId: string,
    instance: string,
  ): Promise<PushInstallationWithId | null> {
    return this.collection.findOne(
      this.filterById(installationId, instance),
    );
  }

  /**
   * Find an installation by endpoint URL.
   */
  async findByEndpoint(
    endpoint: string,
  ): Promise<PushInstallationWithId | null> {
    return this.collection.findOne({ endpoint });
  }

  /**
   * Find all active installations subscribed to a given topic.
   */
  async findActiveByTopic(
    topic: PushTopic,
  ): Promise<PushInstallationWithId[]> {
    const filter: Filter<PushInstallationDocument> = {
      status: 'active',
      [`topics.${topic}`]: true,
    };
    return this.collection.find(filter);
  }

  /**
   * Find all active installations associated with a client-declared AniList user id.
   */
  async findActiveByAnilistUserId(
    userId: number,
  ): Promise<PushInstallationWithId[]> {
    const filter: Filter<PushInstallationDocument> = {
      status: 'active',
      anilistUserId: userId,
      identityState: 'client-declared',
    };
    return this.collection.find(filter);
  }

  // --- Status transitions ---

  /**
   * Update installation status.
   */
  async updateStatus(
    installationId: string,
    instance: string,
    status: PushInstallationDocument['status'],
  ): Promise<void> {
    await this.collection.updateOne(
      this.filterById(installationId, instance),
      {
        $set: {
          status,
          updatedAt: this.nowSeconds(),
          ...(status === 'active'
            ? { lastConfirmedAt: this.nowSeconds() }
            : {}),
        },
      },
    );
  }

  /**
   * Soft-delete (disable) an installation.
   */
  async disable(
    installationId: string,
    instance: string,
  ): Promise<void> {
    await this.updateStatus(installationId, instance, 'disabled');
  }

  /**
   * Mark an installation as expired (endpoint gone).
   */
  async markExpired(
    installationId: string,
    instance: string,
  ): Promise<void> {
    await this.updateStatus(installationId, instance, 'expired');
  }

  // --- Challenge management ---

  async storeChallenge(
    installationId: string,
    instance: string,
    tokenHash: string,
    expiresAt: number,
  ): Promise<void> {
    await this.collection.updateOne(
      this.filterById(installationId, instance),
      {
        $set: {
          challenge: {
            tokenHash,
            expiresAt: new Date(expiresAt * 1000),
            attempts: 0,
          },
          status: 'pending',
          updatedAt: this.nowSeconds(),
        },
      },
    );
  }

  async clearChallenge(
    installationId: string,
    instance: string,
  ): Promise<void> {
    await this.collection.updateOne(
      this.filterById(installationId, instance),
      { $unset: { challenge: '' } },
    );
  }

  // --- Profile & Preferences ---

  async updateProfile(
    installationId: string,
    instance: string,
    updates: Partial<
      Pick<
        PushInstallationDocument,
        | 'app'
        | 'device'
        | 'locale'
        | 'capabilities'
        | 'lastView'
        | 'anilistUserId'
        | 'identityState'
      >
    >,
  ): Promise<void> {
    const $set: Record<string, unknown> = {
      updatedAt: this.nowSeconds(),
      lastProfileSyncAt: this.nowSeconds(),
    };

    if (updates.app !== undefined) $set.app = updates.app;
    if (updates.device !== undefined) $set.device = updates.device;
    if (updates.locale !== undefined) $set.locale = updates.locale;
    if (updates.capabilities !== undefined) {
      $set.capabilities = updates.capabilities;
    }
    if (updates.lastView !== undefined) $set.lastView = updates.lastView;
    if (updates.anilistUserId !== undefined) {
      $set.anilistUserId = updates.anilistUserId;
    }
    if (updates.identityState !== undefined) {
      $set.identityState = updates.identityState;
    }

    await this.collection.updateOne(
      this.filterById(installationId, instance),
      { $set },
    );
  }

  async updatePreferences(
    installationId: string,
    instance: string,
    topics: PushInstallationDocument['topics'],
  ): Promise<void> {
    await this.collection.updateOne(
      this.filterById(installationId, instance),
      {
        $set: {
          topics,
          updatedAt: this.nowSeconds(),
        },
      },
    );
  }
}

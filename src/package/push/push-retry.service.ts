import { Injectable, SCOPE } from '@danet/core';
import { Interval } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { createLazyClient, type Redis } from '@db/redis';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { PushSenderService } from '@scope/service/push-sender';
import type { PushSubscription } from '@scope/service/push-sender';
import { PushRepository } from './push.repository.ts';

interface RetryJob {
  installationId: string;
  instance: string;
  endpoint: string;
  keys: PushSubscription['keys'];
  payload: Record<string, unknown>;
  type: string;
  attempt: number; // 1-based retry count
  nextRetryAt: number; // epoch ms
}

const RETRY_BACKOFF_MS = [0, 60_000, 300_000, 1_800_000]; // attempts 1-4
const MAX_RETRIES = 4;
const RETRY_POLL_INTERVAL_MS = 60_000; // poll every minute
const REDIS_KEY = 'edge:push:retry';

@Injectable({ scope: SCOPE.GLOBAL })
export class PushRetryService implements OnAppBootstrap, OnAppClose {
  private redis!: Redis;
  private polling = false;

  constructor(
    secret: SecretService,
    private readonly pushSender: PushSenderService,
    private readonly pushRepo: PushRepository,
    private readonly logger: LoggerService,
  ) {
    this.redis = this.createRedisClient(secret);
  }

  private createRedisClient(secret: SecretService): Redis {
    const url = secret.get<string>('REDIS_URL');
    const { hostname, port, username, password } = new URL(url);
    const options: Parameters<typeof createLazyClient>[0] = {
      hostname,
      port: Number.parseInt(port, 10),
    };

    if (username.length > 0) {
      options.username = username;
    }
    if (password.length > 0) {
      options.password = password;
    }

    return createLazyClient(options);
  }

  /** Enqueue a retry job after a failed delivery. */
  async enqueue(job: Omit<RetryJob, 'attempt' | 'nextRetryAt'>): Promise<void> {
    if (!this.redis.isConnected) return;

    const retryJob: RetryJob = {
      ...job,
      attempt: 1,
      nextRetryAt: Date.now() + RETRY_BACKOFF_MS[0],
    };

    const jobId = `${job.installationId}:${job.instance}:${job.type}:${
      (job.payload as { id: string }).id ?? '0'
    }`;
    await this.redis.hset(REDIS_KEY, jobId, JSON.stringify(retryJob));
  }

  /** Poll for due retry jobs and attempt delivery. Runs every minute. */
  @Interval(RETRY_POLL_INTERVAL_MS)
  async poll(): Promise<void> {
    if (this.polling || !this.redis.isConnected) return;
    this.polling = true;

    try {
      const jobs = await this.redis.hgetall(REDIS_KEY);
      const now = Date.now();

      for (const [jobId, raw] of Object.entries(jobs)) {
        const job: RetryJob = JSON.parse(raw);
        if (job.nextRetryAt > now) continue; // not due yet

        try {
          const subscriber = this.pushSender.subscribe({
            endpoint: job.endpoint,
            keys: job.keys,
          });
          const result = await this.pushSender.send(
            subscriber,
            job.endpoint,
            job.payload as Parameters<PushSenderService['send']>[2],
            job.installationId,
          );

          if (result.gone) {
            await this.pushRepo.markExpired(
              job.installationId,
              job.instance,
            );
            await this.redis.hdel(REDIS_KEY, jobId);
          } else if (result.success) {
            await this.redis.hdel(REDIS_KEY, jobId);
            this.logger.instance.debug(`Retry succeeded for ${jobId}`);
          } else if (job.attempt < MAX_RETRIES) {
            // Still failing — schedule next retry
            const nextAttempt = job.attempt + 1;
            job.attempt = nextAttempt;
            job.nextRetryAt = now + RETRY_BACKOFF_MS[nextAttempt - 1];
            await this.redis.hset(REDIS_KEY, jobId, JSON.stringify(job));
          } else {
            // Max retries reached — give up
            await this.redis.hdel(REDIS_KEY, jobId);
            this.logger.instance.warn(
              `Retry exhausted for ${jobId} after ${MAX_RETRIES} attempts`,
            );
          }
        } catch (error) {
          this.logger.instance.warn(
            `Retry attempt failed for ${jobId}`,
            { cause: error },
          );
        }
      }
    } finally {
      this.polling = false;
    }
  }

  async onAppBootstrap(): Promise<void> {
    try {
      await this.redis.connect();
      const pong = await this.redis.ping();
      this.logger.instance.debug(
        `Push-retry Redis connection validated: ${pong}`,
      );
    } catch (err) {
      this.logger.instance.warn(
        'Push-retry Redis connection failed during bootstrap. Push retries will be unavailable until Redis is configured.',
        { cause: err },
      );
    }
  }

  async onAppClose(): Promise<void> {
    if (this.redis.isConnected) {
      this.redis.close();
    }
  }
}

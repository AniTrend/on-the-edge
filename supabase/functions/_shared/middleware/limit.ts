import { Ratelimit } from 'skypack/upstash/ratelimit';
import { Redis } from 'x/upstash_redis';
import type { AppContext } from '../types/core.d.ts';
import { Response, Status } from 'x/oak';
import { logger } from '../core/logger.ts';
import { generateUUID } from '../core/utils.ts';
import { between } from 'x/optic/profiler';
import { env } from '../core/env.ts';

const ephemeralCache = new Map();

const requests = env<number>('RATE_LIMIT_REQUESTS');
const window = env<number>('RATE_LIMIT_WINDOW');

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  ephemeralCache: ephemeralCache,
  limiter: Ratelimit.slidingWindow(
    requests,
    `${window} s`,
  ),
  analytics: true,
});

const applyHeaders = (
  response: Response,
  limit: number,
  remaining: number,
  reset: number,
) => {
  response.headers.append('RateLimit-Policy', `${requests};w=${window}`);
  response.headers.append('X-RateLimit-Limit', limit.toString());
  response.headers.append('X-RateLimit-Remaining', remaining.toString());
  response.headers.append('X-RateLimit-Reset', reset.toString());
};

export default async (
  { state, request, response }: AppContext,
  next: () => Promise<unknown>,
) => {
  logger.mark('limiter_start');
  const { envrionment } = state;
  const identifier = await generateUUID(
    envrionment.namespace,
    request.ip,
  );
  const { success, limit, remaining, reset } = await ratelimit.limit(
    identifier,
  );
  applyHeaders(response, limit, remaining, reset);
  logger.mark('limiter_end');
  logger.measure(between('limiter_start', 'limiter_end'));
  if (!success) {
    response.status = Status.TooManyRequests;
    response.type = 'application/json';
    response.body = <Error> {
      message: 'Too many request',
    };
    logger.warn(`Rate limit reached, blocking request`);
    return;
  }
  await next();
};

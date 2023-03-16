import { Status, STATUS_TEXT } from 'x/oak';
import { RateLimiter } from 'x/oak_rate_limit';
import type { LimiterOptions } from '../types/state.d.ts';

export default async (opts: LimiterOptions) => {
  return await RateLimiter({
    windowMs: opts?.window,
    max: opts?.limit,
    headers: true,
    message: STATUS_TEXT[Status.TooManyRequests],
    statusCode: Status.TooManyRequests,
  });
};

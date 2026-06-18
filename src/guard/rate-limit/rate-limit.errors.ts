export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;
  readonly limit: number;

  constructor(message: string, retryAfterSeconds: number, limit: number) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.limit = limit;
  }
}

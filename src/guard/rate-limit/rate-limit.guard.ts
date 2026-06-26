import { AuthGuard, ExecutionContext, Injectable, Logger } from '@danet/core';
import { RateLimitService } from './rate-limit.service.ts';
import { RateLimitConfig } from './rate-limit.types.ts';

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  'POST /v1/push/installations': { maxRequests: 5, windowSeconds: 3600 },
  'POST /v1/push/installations/:installationId/confirm': {
    maxRequests: 10,
    windowSeconds: 300,
  },
  'PUT /v1/push/installations/:installationId/profile': {
    maxRequests: 30,
    windowSeconds: 3600,
  },
  'PATCH /v1/push/installations/:installationId/preferences': {
    maxRequests: 30,
    windowSeconds: 3600,
  },
  'DELETE /v1/push/installations/:installationId': {
    maxRequests: 10,
    windowSeconds: 3600,
  },
  'POST /v1/push/installations/:installationId/test': {
    maxRequests: 5,
    windowSeconds: 300,
  },
};

@Injectable()
export class RateLimitGuard implements AuthGuard {
  private readonly logger: Logger = new Logger(RateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    const request = context.req.raw;
    const method = request.method;
    const path = new URL(request.url).pathname;
    const routeKey = this.matchRoute(method, path);

    if (!routeKey) return true;

    const config = ENDPOINT_LIMITS[routeKey];
    const key = `edge:ratelimit:${routeKey}:${path}`;

    return this.rateLimitService.checkLimit(
      key,
      config.maxRequests,
      config.windowSeconds,
    )
      .then((result) => {
        if (!result.allowed) {
          this.logger.warn(`Rate limit exceeded for ${routeKey}`);
          return false;
        }
        return true;
      });
  }

  private matchRoute(method: string, path: string): string | undefined {
    for (const routeKey of Object.keys(ENDPOINT_LIMITS)) {
      if (!routeKey.startsWith(method)) continue;
      const configPath = routeKey.substring(method.length + 1);
      if (this.pathsMatch(configPath, path)) return routeKey;
    }
    return undefined;
  }

  private pathsMatch(configPath: string, requestPath: string): boolean {
    const configParts = configPath.split('/');
    const requestParts = requestPath.split('/');
    if (configParts.length !== requestParts.length) return false;
    for (let i = 0; i < configParts.length; i++) {
      if (configParts[i] === requestParts[i]) continue;
      if (configParts[i].startsWith(':')) continue;
      return false;
    }
    return true;
  }
}

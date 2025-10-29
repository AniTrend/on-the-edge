import {
  DanetMiddleware,
  HttpContext,
  Injectable,
  NextFunction,
} from '@danet/core';
import { LoggerService } from '@scope/logger';
import { between } from '@onjara/optic';

@Injectable()
export class LoggerMiddleware implements DanetMiddleware {
  constructor(private readonly logger: LoggerService) {}

  async action(context: HttpContext, next: NextFunction) {
    const start =
      `logger-middleware-start: [${context.req.method}] ${context.req.path}`;
    const end = 'logger-middleware-end';
    this.logger.instance.mark(start);
    await next();
    this.logger.instance.mark(end);
    this.logger.instance.measure(between(start, end));
  }
}

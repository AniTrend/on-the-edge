import {
  DanetMiddleware,
  HttpContext,
  Injectable,
  NextFunction,
} from '@danet/core';
import { between } from '@onjara/optic';
import { LoggerService } from '@scope/logger';
import { ExperimentService } from '@scope/experiment';
import { SecretService } from '@scope/secret';
import { getClientAttributes } from '@scope/common/utils';
import { isHealthCheck } from './health-check.ts';

@Injectable()
export class GrowthBookMiddleware implements DanetMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly secret: SecretService,
    private readonly service: ExperimentService,
  ) {}

  async action(context: HttpContext, next: NextFunction) {
    // Headerless health probes must not require client attributes or
    // trigger a GrowthBook feature fetch on every health check.
    if (isHealthCheck(context)) {
      await next();
      return;
    }
    this.logger.instance.mark('load-features-start');
    const { error, source } = await this.service.init({
      timeout: this.secret.get<number>('GROWTH_TIME_OUT'),
    });
    this.logger.instance.mark('load-features-end');
    this.logger.instance.measure(
      between('load-features-start', 'load-features-end'),
    );

    if (error) {
      this.logger.instance.error('Failed to load features', error);
    } else {
      this.service.getInstance().setAttributes({
        attributes: getClientAttributes(context),
      });
      this.logger.instance.info('Features loaded', source);
    }
    await next();
    try {
      this.service.destroy();
    } catch (err) {
      this.logger.instance.error('Failed to destroy experiment client', {
        err,
      });
    }
  }
}

import { UserAgent } from '@std/http';
import {
  DanetMiddleware,
  ForbiddenException,
  HttpContext,
  Injectable,
  Logger,
  NextFunction,
} from '@danet/core';
import { ClientAttributes, RequestAttributes } from '@scope/common/types';
import { setClientAttributes, setRequestAttributes } from '@scope/common/utils';
import { SecretService } from '@scope/secret';

@Injectable()
export class HeaderMiddleware implements DanetMiddleware {
  private readonly logger: Logger = new Logger(HeaderMiddleware.name);

  constructor(
    private readonly secret: SecretService,
  ) {}

  private readonly REQUIRED_HEADERS: string[] = [
    'host',
    'accept',
    'accept-encoding',
    'user-agent',
    'x-app-name',
    'x-app-version',
    'x-app-code',
    'x-app-source',
    'x-app-locale',
    'x-app-build',
  ];

  private fail = (header: string, _context: HttpContext) => {
    const message = `Missing required header: ${header}`;
    if (!this.secret.isDevelopment()) {
      this.logger.error(message);
      throw new ForbiddenException();
    } else {
      this.logger.warn(message);
    }
  };

  private requestAttributes = (request: Request): RequestAttributes => {
    const { headers } = request;
    return {
      authorization: headers.get('authorization'),
      accepts: headers.get('accepts')!,
      agent: headers.get('user-agent')!,
      contentType: headers.get('content-type'),
      acceptEncoding: headers.get('accept-encoding')!,
    };
  };

  private clientAttributes = (request: Request): ClientAttributes => {
    const { headers } = request;
    const userAgentString = headers.get('user-agent')!;
    const { browser, cpu, device, engine, os } = new UserAgent(userAgentString);

    return {
      locale: headers.get('x-app-locale')!,
      version: headers.get('x-app-version')!,
      source: headers.get('x-app-source')!,
      code: headers.get('x-app-code')!,
      label: headers.get('x-app-name')!,
      build: headers.get('x-app-build')!,
      platform: {
        browserName: browser.name ?? null,
        browserVersion: browser.version ?? null,
        cpuArchitecture: cpu.architecture ?? null,
        deviceModel: device.model ?? null,
        deviceVendor: device.vendor ?? null,
        deviceType: device.type ?? null,
        engineName: engine.name ?? null,
        engineVersion: engine.version ?? null,
        osName: os.name ?? null,
        osVersion: os.version ?? null,
      },
    };
  };

  async action(context: HttpContext, next: NextFunction) {
    const request = context.req.raw;
    for (const header of this.REQUIRED_HEADERS) {
      if (!request.headers.has(header)) {
        this.fail(header, context);
      }
    }
    setRequestAttributes(context, this.requestAttributes(request));
    setClientAttributes(context, this.clientAttributes(request));
    await next();
  }
}

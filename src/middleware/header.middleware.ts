import { UserAgent } from '@std/http';
import { ZodError } from 'zod';
import {
  DanetMiddleware,
  ForbiddenException,
  HttpContext,
  Injectable,
  Logger,
  NextFunction,
} from '@danet/core';
import {
  ClientContext,
  clientContextSchema,
  ClientHeader,
  RequestAttributes,
  UpdateProduct,
} from '@scope/common/types';
import { setClientAttributes, setRequestAttributes } from '@scope/common/utils';
import { SecretService } from '@scope/secret';
import { isHealthCheck } from './health-check.ts';

@Injectable()
export class HeaderMiddleware implements DanetMiddleware {
  private readonly logger: Logger = new Logger(HeaderMiddleware.name);

  constructor(
    private readonly secret: SecretService,
  ) {}

  // Canonical client headers expected from the mobile clients. These are
  // client-supplied targeting metadata, not authentication, and must never
  // be used to authorize privileged operations.
  private readonly REQUIRED_HEADERS: string[] = [
    'host',
    'accept',
    'accept-encoding',
    'user-agent',
    ClientHeader.appId,
    ClientHeader.package,
    ClientHeader.version,
    ClientHeader.versionCode,
    ClientHeader.source,
    ClientHeader.locale,
    ClientHeader.buildType,
    ClientHeader.deviceBuildId,
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

  private failValue = (error: ZodError) => {
    const detail = error.issues
      .map((issue) => `${issue.path.join('.')} (${issue.code})`)
      .join(', ');
    const message = `Invalid client context headers: ${detail}`;
    if (!this.secret.isDevelopment()) {
      this.logger.error(message);
      throw new ForbiddenException();
    } else {
      this.logger.warn(message);
    }
  };

  private platform = (
    headers: Headers,
    deviceBuildId: string | null,
  ): ClientContext['platform'] => {
    const userAgentString = headers.get('user-agent') ?? '';
    const { browser, cpu, device, engine, os } = new UserAgent(userAgentString);
    return {
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
      deviceBuildId,
    };
  };

  // Dev-only best-effort context so local development can continue after a
  // validation warning instead of failing the request.
  private devClientContext = (headers: Headers): ClientContext => {
    const appId = headers.get(ClientHeader.appId);
    const versionCode = Number.parseInt(
      headers.get(ClientHeader.versionCode) ?? '',
      10,
    );
    const deviceBuildId = headers.get(ClientHeader.deviceBuildId);
    return {
      appId: appId === UpdateProduct.ANITREND_V2
        ? UpdateProduct.ANITREND_V2
        : UpdateProduct.ANITREND_APP,
      packageName: headers.get(ClientHeader.package) ?? '',
      version: headers.get(ClientHeader.version) ?? '',
      versionCode: Number.isSafeInteger(versionCode) && versionCode > 0
        ? versionCode
        : 0,
      source: headers.get(ClientHeader.source) ?? '',
      locale: headers.get(ClientHeader.locale) ?? '',
      buildType: headers.get(ClientHeader.buildType) ?? '',
      platform: this.platform(
        headers,
        deviceBuildId && deviceBuildId.length > 0 ? deviceBuildId : null,
      ),
    };
  };

  private clientContext = (request: Request): ClientContext => {
    const { headers } = request;
    const parsed = clientContextSchema.safeParse({
      appId: headers.get(ClientHeader.appId),
      packageName: headers.get(ClientHeader.package),
      version: headers.get(ClientHeader.version),
      versionCode: headers.get(ClientHeader.versionCode),
      source: headers.get(ClientHeader.source),
      locale: headers.get(ClientHeader.locale),
      buildType: headers.get(ClientHeader.buildType),
      deviceBuildId: headers.get(ClientHeader.deviceBuildId) ?? null,
    });

    if (!parsed.success) {
      this.failValue(parsed.error);
      return this.devClientContext(headers);
    }

    return {
      ...parsed.data,
      platform: this.platform(headers, parsed.data.deviceBuildId),
    };
  };

  async action(context: HttpContext, next: NextFunction) {
    if (isHealthCheck(context)) {
      await next();
      return;
    }
    const request = context.req.raw;
    for (const header of this.REQUIRED_HEADERS) {
      if (!request.headers.has(header)) {
        this.fail(header, context);
      }
    }
    setRequestAttributes(context, this.requestAttributes(request));
    setClientAttributes(context, this.clientContext(request));
    await next();
  }
}

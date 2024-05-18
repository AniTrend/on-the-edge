import { HTTPMethods, Status } from 'x/oak';
import { logger } from '../core/logger.ts';
import type { AppContext, ErrorResponse } from '../types/core.d.ts';

const bodyTypes: HTTPMethods[] = [
  'PATCH',
  'POST',
  'PUT',
];

const optional: string[] = [
  'content-type',
  'x-app-name',
  'x-app-version',
  'x-app-code',
  'x-app-source',
  'x-app-locale',
  'x-app-build-type',
];

const enforced: string[] = [
  'host',
  'accept',
  'accept-encoding',
  'user-agent',
];

const fail = (header: string, ctx: AppContext) => {
  const { response } = ctx;
  response.status = Status.BadRequest;
  response.type = 'application/json';
  response.body = <ErrorResponse> {
    message: 'Missing required header',
  };
  logger.error(
    `common.middleware.header:fail: Required header is missing from request: ${header}`,
  );
};

const pass = async (ctx: AppContext, next: () => Promise<unknown>) => {
  const { state, request } = ctx;
  const { headers } = request;

  state.contextHeader = {
    authorization: headers.get('authorization'),
    accepts: ctx.request.accepts()!,
    agent: headers.get('user-agent')!,
    contentType: headers.get('content-type'),
    acceptEncoding: headers.get('accept-encoding')!,
    application: {
      locale: headers.get('x-app-locale'),
      version: headers.get('x-app-version'),
      source: headers.get('x-app-source'),
      code: headers.get('x-app-code'),
      label: headers.get('x-app-name'),
      buildType: headers.get('x-app-build-type'),
    },
  };
  logger.debug('common.middleware.header:pass: ->', state.contextHeader);
  await next();
};

export default async (ctx: AppContext, next: () => Promise<unknown>) => {
  const { headers, method } = ctx.request;

  if (bodyTypes.includes(method)) {
    enforced.push(...optional);
  }

  for (const header of enforced) {
    if (!headers.has(header)) {
      fail(header, ctx);
      return;
    }
  }

  await pass(ctx, next);
};

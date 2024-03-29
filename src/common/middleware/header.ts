import { HTTPMethods, Status } from 'x/oak';
import { logger } from '../core/logger.ts';
import type { AppContext, Error } from '../types/core.d.ts';

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
  'x-forwarded-for',
];

const enforced: string[] = [
  'host',
  'accept',
  'accept-encoding',
  'accept-language',
  'user-agent',
];

const fail = (header: string, ctx: AppContext) => {
  const { response } = ctx;
  response.status = Status.BadRequest;
  response.type = 'application/json';
  response.body = <Error> {
    message: 'Missing required header',
  };
  logger.error(`Required header is missing from request: ${header}`);
};

const pass = async (ctx: AppContext, next: () => Promise<unknown>) => {
  const { state, request } = ctx;
  const { headers } = request;

  const userAgent = headers.get('user-agent') ?? null;

  state.contextHeader = {
    authorization: headers.get('authorization'),
    accepts: ctx.request.accepts()!,
    agent: userAgent,
    contentType: headers.get('content-type'),
    acceptEncoding: headers.get('accept-encoding')!,
    forwarded: headers.get('x-forwarded-for'),
    language: headers.get('accept-language')!,
    application: {
      locale: headers.get('x-app-name'),
      version: headers.get('x-app-version'),
      source: headers.get('x-app-code'),
      code: headers.get('x-app-source'),
      label: headers.get('x-app-locale'),
      buildType: headers.get('x-app-build-type'),
    },
  };
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

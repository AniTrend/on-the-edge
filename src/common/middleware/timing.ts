import type { AppContext } from '../types/core.d.ts';

export default async (
  { response }: AppContext,
  next: () => Promise<unknown>,
) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  response.headers.set('x-response-time', `${duration}ms`);
};

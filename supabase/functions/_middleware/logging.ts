import type { AppContext } from "../_types/core.d.ts";

export default async (
  { request, state }: AppContext,
  next: () => Promise<unknown>,
) => {
  await next();
  const { method, url, headers } = request;
  state.logger.debug(`${method} ${url}`);
  for (const [key, value] of headers.entries()) {
    state.logger.debug(`${key}: ${value}`);
  }
};

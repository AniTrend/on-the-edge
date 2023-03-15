import type { AppContext } from "../_types/core.d.ts";

export default async (
  { response }: AppContext,
  next: () => Promise<unknown>,
) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  response.headers.set("X-Response-Time", `${ms}ms`);
};

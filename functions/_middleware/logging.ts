import logger from "../_core/logger.ts";
import { Context } from "x/oak";

export default async (ctx: Context, next: () => Promise<unknown>) => {
  await next();
  const { method, url, headers } = ctx.request;
  logger.info(`${method} ${url}`);
  for (const [key, value] of headers.entries()) {
    logger.info(`${key}: ${value}`);
  }
};

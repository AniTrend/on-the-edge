import { Context, HTTPMethods } from "x/oak";
import logger from "../_core/logger.ts";

export default (methods: HTTPMethods[]) =>
async (ctx: Context, next: () => Promise<unknown>) => {
  const method = ctx.request.method;

  if (!methods.includes(method)) {
    ctx.response.status = 405;
    ctx.response.headers.set("Allow", methods.join(", "));
    logger.error(
      `${method} method not allowed. Allowed methods: ${methods.join(", ")}`,
    );
    return;
  }

  await next();
};

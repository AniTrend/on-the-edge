import type { AppContext } from "../_types/core.d.ts";

import { HTTPMethods } from "x/oak";

export default (methods: HTTPMethods[]) =>
async (ctx: AppContext, next: () => Promise<unknown>) => {
  const method = ctx.request.method;

  if (!methods.includes(method)) {
    ctx.response.status = 405;
    ctx.response.headers.set("Allow", methods.join(", "));
    ctx.state.logger.error(
      `${method} method not allowed. Allowed methods: ${methods.join(", ")}`,
    );
    return;
  }

  await next();
};

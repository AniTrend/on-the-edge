import { Status } from "x/oak";
import type { AppContext } from "../_types/core.d.ts";

const fail = (ctx: AppContext) => {
  const { response, state } = ctx;
  response.status = Status.Forbidden;
  state.logger.error("Client did not specify mandatory headers");
};

export default async (ctx: AppContext, next: () => Promise<unknown>) => {
  const { headers, method } = ctx.request;
  const accept = headers.get("accept");
  const userAgent = headers.get("user-agent");

  if (method == "POST") {
    const contentType = headers.get("content-type");
    const contentLength = headers.get("content-length");

    if (accept && userAgent && contentType && contentLength) {
      await next();
    } else {
      fail(ctx);
    }
  } else {
    if (accept && userAgent) {
      await next();
    } else {
      fail(ctx);
    }
  }
};

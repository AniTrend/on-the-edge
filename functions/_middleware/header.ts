import { Context, Status } from "x/oak";
import logger from "../_core/logger.ts";

export default async (ctx: Context, next: () => Promise<unknown>) => {
  const { headers } = ctx.request;
  const accept = headers.get("accept");
  const userAgent = headers.get("user-agent");
  const contentType = headers.get("content-type");
  const contentLength = headers.get("content-length");
  if (accept && userAgent && contentType && contentLength) {
    await next();
  } else {
    ctx.response.status = Status.Forbidden;
    logger.error("Client did not specify mandatory headers")
  }
};

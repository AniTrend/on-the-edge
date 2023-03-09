import { isHttpError, Status, STATUS_TEXT } from "x/oak";
import { Context } from "x/oak";
import logger from "../_core/logger.ts";
import type { Error } from "../_core/types.ts";

export default async (ctx: Context, next: () => Promise<unknown>) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      logger.error(err);
      const status = err.status;
      ctx.response.status = err.status;
      ctx.response.body = <Error> { message: STATUS_TEXT[status] };
    } else {
      logger.error(err);
      const status = Status.InternalServerError;
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = <Error> { message: STATUS_TEXT[status] };
    }
  }
};

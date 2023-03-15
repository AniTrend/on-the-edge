import { isHttpError, Status, STATUS_TEXT } from "x/oak";
import type { Error } from "../_types/core.d.ts";
import type { AppContext } from "../_types/core.d.ts";

export default async (
  { state, response }: AppContext,
  next: () => Promise<unknown>,
) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      state.logger.error(err);
      const status = err.status;
      response.status = status;
      response.body = <Error> { message: STATUS_TEXT[status] };
    } else {
      state.logger.error(err);
      const status = Status.InternalServerError;
      response.status = Status.InternalServerError;
      response.body = <Error> { message: STATUS_TEXT[status] };
    }
  }
};

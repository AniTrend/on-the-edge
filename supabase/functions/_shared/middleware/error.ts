import { isHttpError, Status, STATUS_TEXT } from 'x/oak';
import { logger } from '../core/logger.ts';
import type { Error } from '../types/core.d.ts';
import type { AppContext } from '../types/core.d.ts';

export default async (
  { response }: AppContext,
  next: () => Promise<unknown>,
) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      logger.error(err);
      const status = err.status;
      response.status = status;
      response.body = <Error> { message: STATUS_TEXT[status] };
    } else {
      logger.error(err);
      const status = Status.InternalServerError;
      response.status = Status.InternalServerError;
      response.body = <Error> { message: STATUS_TEXT[status] };
    }
  }
};

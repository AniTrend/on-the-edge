import {
    isHttpError,
    Status
} from "x/oak"
import {
    Context
} from 'x/oak'
import logger from '../_core/logger.ts'

export default async (ctx: Context, next: () => Promise < unknown > ) => {
    try {
        await next();
    } catch (err) {
        if (isHttpError(err)) {
            switch (err.status) {
                case Status.NotFound:
                    break;
                default:
                    break;
            }
        } else {
            logger.error(err.message)
        }

        ctx.response.body = {
            code: err.status
        }
    }
}
import logger from '../_core/logger.ts'
import { Context } from 'x/oak'


export default async (ctx: Context, next: () => Promise<unknown>) => {
    await next();
    
    const { method, url, headers } = ctx.request;
    const rt = headers.get("X-Response-Time");
    logger.debug("\n")
    logger.debug("----------------------------------")
    logger.info(`${method} ${url} - ${rt}`)
    for (const [key, value] of headers.entries()) {
        logger.info(`${key}: ${value}`)
    }
    logger.debug("----------------------------------")
    logger.debug("\n")
}

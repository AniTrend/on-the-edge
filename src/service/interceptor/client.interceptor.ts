import { LoggerService } from '@scope/logger';
import { between } from '@onjara/optic';
import {
  RequestInterceptor,
  ResponseInterceptor,
} from '@anitrend/request-client';

export const requestInterceptor =
  (logger: LoggerService): RequestInterceptor => (config) => {
    logger.instance.debug(
      `----> ${config.baseURL}`,
      config.params ?? config.data,
    );
    logger.instance.mark(`${config.baseURL} | start`);
    return config;
  };

export const responseInterceptor =
  (logger: LoggerService): ResponseInterceptor => (response) => {
    logger.instance.debug(
      `<---- ${response.config.baseURL}`,
      response.config.params ?? response.config.data,
    );
    logger.instance.mark(`${response.config.baseURL} | end`);
    logger.instance.measure(
      between(
        `${response.config.baseURL} | start`,
        `${response.config.baseURL} | end`,
      ),
    );
    return response;
  };

import { between } from 'x/optic';
import { State } from '../types/state.d.ts';
import { UAParser } from 'esm/ua_parser';
import { logger } from '../core/logger.ts';
import type { AppContext } from '../types/core.d.ts';

const contextAttributes = (
  { contextHeader }: State,
): Promise<Record<string, unknown>> => {
  const { application, agent } = contextHeader;

  let attributes: Record<string, unknown> = {};

  if (application) {
    attributes = {
      'app_version': application.version,
      'app_source': application.source,
      'app_code': application.code,
      'app_build_type': application.buildType,
      'app_label': application.label,
      'app_locale': application.locale,
    };
  }

  const parser = new UAParser(agent);
  const { browser, cpu, device, engine, os } = parser.getResult();

  return Promise.resolve({
    'browser_name': browser.name,
    'browser_version': browser.version,
    'cpu_architecture': cpu.architecture,
    'device_model': device.model,
    'device_vendor': device.vendor,
    'device_type': device.type,
    'engine_name': engine.name,
    'engine_version': engine.version,
    'os_name': os.name,
    'os_version': os.version,
    ...attributes,
  });
};

export default async (
  { state }: AppContext,
  next: () => Promise<unknown>,
) => {
  logger.mark('set-attributes-start');
  await contextAttributes(state).then(async (data) => {
    await state.features.setAttributes(data).then(() => {
      logger.mark('set-attributes-end');
      logger.measure(between('set-attributes-start', 'set-attributes-end'));
    }).catch((e) => {
      logger.error('set-attributes encountered an error', e);
    }).then(async () => {
      await next();
    });
  }).catch((e) => {
    logger.error('contextAttributes encountered an error', e);
  });
};

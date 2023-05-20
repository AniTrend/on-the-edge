import { logger } from '../core/logger.ts';
import { AppContext } from '../types/core.d.ts';
import { State } from '../types/state.d.ts';

const setApplicationAttributes = (state: State) => {
  const { contextHeader } = state;

  if (contextHeader.application) {
    const { buildType, code, label, locale, source, version } =
      contextHeader.application;
    state.growth.setAttributes({
      'app_name': label,
      'app_locale': locale,
      'app_version': version,
      'app_code': code,
      'app_source': source,
      'app_build_type': buildType,
    });
  }
};

const setDeviceAttributes = (state: State) => {
  const { contextHeader } = state;

  if (contextHeader.device) {
    const { browser, cpu, device, engine, os } = contextHeader.device;
    state.growth.setAttributes({
      'device_browser_name': browser.name,
      'device_browser_version': browser.version,
      'device_cpu_architecture': cpu.architecture,
      'device_browser_engine_name': engine.name,
      'device_browser_engine_version': engine.version,
      'device_os_name': os.name,
      'device_os_version': os.version,
      'device_model': device.model,
      'device_type': device.type,
      'device_vendor': device.vendor,
    });
  }
};

export default async (
  { state }: AppContext,
  next: () => Promise<unknown>,
) => {
  try {
    setApplicationAttributes(state);
    setDeviceAttributes(state);
  } catch (e) {
    logger.error('Unable to set attributes for request', e);
  }

  await next();
};

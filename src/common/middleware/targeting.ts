import { between } from 'x/optic';
import { logger } from '../core/logger.ts';
import type { AppContext } from '../types/core.d.ts';

export default async (
  { state }: AppContext,
  next: () => Promise<unknown>,
) => {
  logger.mark('set-attributes-start');
  const { application, agent } = state.contextHeader;
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
  await state.features.setAttributes({
    'user_agent': agent,
    ...attributes,
  }).then(() => {
    logger.mark('set-attributes-end');
    logger.measure(between('set-attributes-start', 'set-attributes-end'));
  }).catch((e) => {
    logger.error('set-attributes encountered an error', e);
  }).finally(async () => {
    await next();
  });
};

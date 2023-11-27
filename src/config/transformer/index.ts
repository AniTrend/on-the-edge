import { Transform } from '../../common/transformer/types.d.ts';
import { ConfigDocument } from '../local/types.d.ts';
import { ClientConfiguration } from './types.d.ts';

export const transform: Transform<
  ConfigDocument | undefined,
  ClientConfiguration
> = (
  sourceData,
) => ({
  settings: {
    analyticsEnabled: false,
  },
  ...sourceData,
});

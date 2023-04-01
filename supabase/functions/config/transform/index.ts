import { Transform } from '../../_shared/transformer/types.d.ts';
import { NavigationItem } from '../local/types.d.ts';
import { Navigation } from './types.d.ts';

export const transform: Transform<NavigationItem, Navigation> = (
  sourceData,
) => ({
  id: sourceData.id,
  destination: sourceData.destination,
  i18n: sourceData.i18n,
  icon: sourceData.icon,
  group: {
    authenticated: sourceData.group.authenticated,
    i18n: sourceData.group.i18n,
    id: sourceData.group.id,
  },
});

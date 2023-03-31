import { OpenGraphData } from '../types.d.ts';
import type { OpenGraphInfo } from './types.d.ts';
import type { Transform } from '../../_shared/transformer/types.d.ts';

export const transform: Transform<OpenGraphData, OpenGraphInfo> = (
  sourceData,
) => ({
  title: sourceData.ogTitle,
  summary: sourceData.ogDescription,
  url: sourceData?.ogUrl,
  site: sourceData?.ogSiteName,
  image: sourceData?.ogImage?.url,
  locale: sourceData?.ogLocale,
});

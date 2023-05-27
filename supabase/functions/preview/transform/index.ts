import type { OpenGraphInfo } from './types.d.ts';
import type { Transform } from '../../_shared/transformer/types.d.ts';
import { OgObject } from 'esm/open-graph/types';

/**
 * {
 * charset:'utf-8'
 * ogDescription:'The Open Graph protocol enables any web page to become a rich object in a social graph.'
 * ogImage:(1) [{…}]
 * ogTitle:'Open Graph protocol'
 * ogType:'website'
 * ogUrl:'https://ogp.me/'
 * requestUrl:'https://ogp.me/'
 * success:true
 * }
 *
 * @param {OgObject} sourceData
 * @returns {OpenGraphInfo}
 */
export const transform: Transform<OgObject, OpenGraphInfo> = (
  sourceData,
) => ({
  title: sourceData.ogTitle ?? null,
  summary: sourceData.ogDescription ?? null,
  url: sourceData?.ogUrl ?? null,
  site: sourceData?.ogSiteName ?? null,
  images: sourceData?.ogImage ?? [],
  locale: sourceData?.ogLocale ?? null,
});

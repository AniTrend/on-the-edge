import { OpenGraphData } from '../types.d.ts';
import type { OpenGraphInfo } from './types.d.ts';

export default (data: OpenGraphData): OpenGraphInfo => {
  return {
    title: data.ogTitle,
    summary: data.ogDescription,
    url: data?.ogUrl,
    site: data?.ogSiteName,
    image: data?.ogImage?.url,
    locale: data?.ogLocale,
  };
};

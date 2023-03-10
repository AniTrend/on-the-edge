import type { OpenGraphInfo } from "./types.ts";
import { OpenGraphData } from "npm/open-graph";

export default (data: OpenGraphData): OpenGraphInfo => {
  return {
    title: data.ogTitle,
    summary: data.ogDescription,
    url: data?.ogUrl,
    site: data?.ogSiteName,
    image: data.ogImage?.url,
    locale: data?.ogLocale,
  };
};

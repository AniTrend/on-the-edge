import type { OpenGraphInfo } from "./types.ts";
import { OpenGraphData } from "open-graph-scraper";

export default (data: OpenGraphData): OpenGraphInfo => {
    return {
        title: data.ogTitle,
        description: data.ogDescription,
        url: data.ogUrl,
        site: data?.ogSiteName,
        image: data.ogImage?.url,
        locale: data?.ogLocale,
    }
}
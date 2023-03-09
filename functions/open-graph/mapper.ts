import { OpenGraphData } from "open-graph-scraper";

type OpenGraphInfo = {
    title: string;
    description: string;
    url: string;
    site: string;
    image: string;
    locale: string;
}

export default (data: OpenGraphData): OpenGraphInfo => {
    return {
        title: data.ogTitle,
        description: data.ogDescription,
        url: data.ogUrl,
        site: data.ogSiteName,
        image: data.ogImage?.url,
        locale: data.ogLocale,
    }
}
import { generateUUID, toEpotch } from "../../_core/utils.ts";
import { News } from "../types.d.ts";

export class NewsTransformer {
  private _namespace: string;

  constructor(namespace: string) {
    this._namespace = namespace;
  }

  private _sanitize = (content: string): string => {
    const regex = /<br\s*\/?>|<img.*?\/?>/g;
    return content.replace(regex, "");
  };

  // deno-lint-ignore no-explicit-any
  private _transform = async (item: Record<string, any>): Promise<News> => {
    return {
      id: await generateUUID(this._namespace, item.guid),
      title: item.title,
      image: item["media:thumbnail"]["@url"],
      author: item.author,
      description: this._sanitize(item.description),
      content: item["content:encoded"],
      link: item.link,
      publishedOn: toEpotch(item.pubDate),
    };
  };

  // deno-lint-ignore no-explicit-any
  apply = (document: Record<string, any>): Promise<News[]> => {
    const items = document.rss.channel.item;
    if (!Array.isArray(items)) {
      throw Error("Expected array for `document.rss.channel.item`");
    }
    return Promise.all(items.map(async (item) => {
      return await this._transform(item);
    }));
  };
}

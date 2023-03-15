import { pagination } from "../../_core/utils.ts";
import { News } from "../types.d.ts";
import { IPaging } from "../../_types/paging.ts";
import { IResponse } from "../../_types/response.ts";
import { fromEntity, toEntity } from "./news-mapper.ts";
import { Client } from "../../_types/core.d.ts";
import { Logger } from "std/log";

export default class NewsRepository {
  private _client: Client;
  private _logger: Logger;

  constructor(client: Client, logger: Logger) {
    this._client = client;
    this._logger = logger;
  }

  saveAll = (news: News[]) => {
    const entities = news.map(toEntity);
    this._client.from("anime_news").upsert(entities);
  };

  getAll = async (
    page: number,
    size: number,
  ): Promise<IPaging<News>> => {
    const { from, to } = pagination(page, size);
    const { data, error, count } = await this._client
      .from("anime_news")
      .select("*", { count: "exact" })
      .order("published_on", { ascending: false })
      .range(from, to);

    if (error) {
      this._logger.error(error);
    }

    const items = data?.map(fromEntity);

    return {
      count: count ?? 0,
      page: page + 1,
      data: items ?? null,
    };
  };

  get = async (
    id: string,
  ): Promise<IResponse<News>> => {
    const { data, error } = await this._client
      .from("anime_news")
      .select("*")
      .filter("id", "eq", id)
      .limit(1);

    if (error) {
      this._logger.error(error);
    }

    const item = data?.map(fromEntity).at(0);

    return {
      data: item ?? null,
    };
  };
}

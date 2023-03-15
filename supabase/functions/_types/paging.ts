import { IResponse } from "./response.ts";

export interface IPaging<T> extends IResponse<T[]> {
  page: number;
  count: number;
}

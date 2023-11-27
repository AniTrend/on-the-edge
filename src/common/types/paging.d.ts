import { IResponse } from './response.d.ts';

export interface IPaging<T> extends IResponse<T[]> {
  page: number;
  count: number;
  total: number;
}

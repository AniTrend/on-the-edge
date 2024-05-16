import { IResponse } from './response.d.ts';

export interface IPaging<T> extends IResponse<T[]> {
  first?: string;
  last?: string;
  count: number;
}

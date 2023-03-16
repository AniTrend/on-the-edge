import { IResponse } from '../../../_shared/types/response.d.ts';

export const fromModel = <T>(resource: IResponse<T>): T => {
  return resource.data!;
};

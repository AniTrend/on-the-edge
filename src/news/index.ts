import type { AppContext } from '../common/types/core.d.ts';
import { isNewsApiv2Enabled } from '../common/experiment/index.ts';
import NewsRepository, {} from './repository/index.ts';
import LocalSource from './local/index.ts';
import { STATUS_CODE } from 'std/server/status';
import { getCollection } from '../common/mongo/index.ts';

export const news = async ({ response, state }: AppContext, sync: boolean) => {
  const { local, features } = state;
  const repository = new NewsRepository(
    new LocalSource(getCollection('news', local)),
  );

  if (sync) {
    await repository.sync();
    response.status = STATUS_CODE.NoContent;
  } else {
    if (isNewsApiv2Enabled(features)) {
      response.type = 'application/json';
      response.body = await repository.getLatest();
    } else {
      response.type = 'application/xml';
      response.body = await repository.getLatestLegacy();
    }
  }
};

import type { AppContext } from '../common/types/core.d.ts';
import { isNewsApiv2Enabled } from '../common/experiment/index.ts';
import NewsRepository, {} from './repository/index.ts';
import LocalSource from './local/source.ts';
import { STATUS_CODE } from 'std/http';
import { collection } from '../common/mongo/index.ts';

export const newsWorker = async ({ response, state }: AppContext) => {
  const { local } = state;
  const repository = new NewsRepository(
    new LocalSource(collection('news', local)),
  );

  await repository.sync();
  response.status = STATUS_CODE.NoContent;
};

export const news = async ({ response, state }: AppContext) => {
  const { local, features } = state;
  const repository = new NewsRepository(
    new LocalSource(collection('news', local)),
  );

  if (isNewsApiv2Enabled(features)) {
    response.type = 'application/json';
    response.body = await repository.getLatest();
  } else {
    response.type = 'application/xml';
    response.body = await repository.getLatestLegacy();
  }
};

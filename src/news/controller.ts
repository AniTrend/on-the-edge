import type { AppContext } from '../common/types/core.ts';
import { isNewsApiv2Enabled } from '../common/experiment/index.ts';
import LocalSource from './local/news.local.source.ts';
import { Status } from '@oak';
import { collection } from '../common/mongo/index.ts';
import { NewsRepository } from './repository/index.ts';

export const newsWorker = async ({ response, state }: AppContext) => {
  const { local } = state;
  const repository = new NewsRepository(
    new LocalSource(collection('news', local)),
  );

  await repository.sync();
  response.status = Status.NoContent;
};

export const news = async ({ request, response, state }: AppContext) => {
  const { local, features } = state;
  const repository = new NewsRepository(
    new LocalSource(collection('news', local)),
  );

  if (isNewsApiv2Enabled(features)) {
    response.type = 'application/json';
    response.body = await repository.getAllPaged({
      before: request.url.searchParams.get('before'),
      after: request.url.searchParams.get('after'),
      limit: request.url.searchParams.get('limit')
        ? Number(request.url.searchParams.get('limit'))
        : null,
    });
  } else {
    response.type = 'application/xml';
    response.body = await repository.getLatestLegacy();
  }
};

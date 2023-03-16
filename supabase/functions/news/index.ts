import { Router } from 'x/oak';

import type { AppContext } from '../_shared/types/core.d.ts';
import factory from '../_shared/core/factory.ts';
import { newsApiv2 } from '../_shared/experiment/index.ts';
import { port } from '../_shared/core/utils.ts';
import NewsRepository, {} from './repository.ts';
import RemoteSource from './remote.ts';
import LocalSource from './local.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/news', async ({ response, state }: AppContext) => {
  const { service, envrionment, supabase, growth } = state;
  const repository = new NewsRepository(
    new LocalSource(supabase),
    new RemoteSource(service.feed),
    envrionment.namespace,
  );

  if (newsApiv2(growth)) {
    response.type = 'application/json';
    response.body = await repository.getLatest();
  } else {
    response.type = 'application/xml';
    response.body = await repository.getLatestLegacy();
  }
});

await factory({
  router: router,
}).listen({ port });

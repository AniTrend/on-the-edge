import { Router, Status } from 'x/oak';

import type { AppContext } from '../_shared/types/core.d.ts';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import NewsRepository, {} from '../news/repository.ts';
import LocalSource from '../news/local.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/news-sync', async ({ response, state }: AppContext) => {
  const { envrionment, supabase } = state;
  const repository = new NewsRepository(
    new LocalSource(supabase),
    envrionment.namespace,
  );
  await repository.sync();

  response.status = Status.NoContent;
});

await factory({
  router: router,
}).listen({ port });

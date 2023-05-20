import { Router } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';
import { Repository } from './repository/index.ts';
import { Local } from './local/index.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/config', async ({ state, response }: AppContext) => {
  const local = new Local(state.supabase);
  const repository = new Repository(
    state.growth,
    local,
  );
  response.type = 'application/json';
  response.body = await repository.getConfiguration();
});

await factory({
  router: router,
}).listen({ port });

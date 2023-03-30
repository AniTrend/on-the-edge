import { Router, Status } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';
import Repository from './repository/index.ts';
import LocalSource from './local/index.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/series', async ({ state, request, response }: AppContext) => {
  const params = request.url.searchParams;
  const anilist = Number(params.get('anilist'));
  const repository = new Repository(
    new LocalSource(state.supabase),
  );

  response.type = 'application/json';
  response.status = Status.OK;
  response.body = await repository.getById(anilist);
});

await factory({
  router: router,
}).listen({ port });

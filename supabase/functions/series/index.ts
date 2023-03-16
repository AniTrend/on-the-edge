import { Router, Status } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';
import Repository from './repository/index.ts';
import LocalSource from './repository/local.ts';
import Arm from './service/arm/remote.ts';
import Jikan from './service/jikan/remote.ts';
import Notify from './service/notify/remote.ts';
import Skyhook from './service/skyhook/remote.ts';
import Theme from './service/theme/remote.ts';
import Tmdb from './service/tmdb/remote.ts';
import Trakt from './service/trakt/remote.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/series', async ({ state, request, response }: AppContext) => {
  const params = request.url.searchParams;
  const anilist = Number(params.get('anilist'));
  const repository = new Repository(
    new Arm(state.service.yuna, state.growth),
    new Jikan(state.service.mal, state.growth),
    new Notify(state.service.notify, state.growth),
    new Skyhook(state.service.skyhook, state.growth),
    new Theme(state.service.themes, state.growth),
    new Tmdb(state.service.tmdb, state.growth),
    new Trakt(state.service.trakt, state.growth),
    new LocalSource(state.supabase),
    state.growth,
  );

  response.type = 'application/json';
  response.status = Status.OK;
  response.body = await repository.getById(anilist);
});

await factory({
  router: router,
}).listen({ port });

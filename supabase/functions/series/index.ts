import { Router, Status } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext, Error } from '../_shared/types/core.d.ts';
import LocalSource from './local/index.ts';
import SeriesRepository from './repository/series.ts';
import SeasonRepository from './repository/season.ts';
import { getCollection } from '../_shared/mongo/index.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/series', async ({ request, response }: AppContext) => {
  const params = request.url.searchParams;
  if (params.has('id')) {
    const id = Number(params.get('id'));

    const series = await new SeriesRepository(
      new LocalSource(getCollection('series')),
      new SeasonRepository(),
    ).getById(id);

    response.type = 'application/json';
    response.status = Status.OK;
    response.body = series;
  } else {
    response.type = 'application/json';
    response.status = Status.BadRequest;
    response.body = <Error> {
      message: `Missing required argument 'id'`,
    };
  }
});

await factory({
  router: router,
}).listen({ port });

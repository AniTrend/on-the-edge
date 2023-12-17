import { Status } from 'x/oak';
import { AppContext, Error } from '../common/types/core.d.ts';
import LocalSource from './local/index.ts';
import SeriesRepository from './repository/series.ts';
import SeasonRepository from './repository/season.ts';
import { getCollection } from '../common/mongo/index.ts';

export const series = async ({ request, response, state }: AppContext) => {
  const params = request.url.searchParams;
  if (params.has('id')) {
    const id = Number(params.get('id'));

    const series = await new SeriesRepository(
      new LocalSource(getCollection('series', state.local)),
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
};

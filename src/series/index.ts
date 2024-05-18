import { Status } from 'x/oak';
import { AppContext, ErrorResponse } from '../common/types/core.d.ts';
import LocalSource from './local/source.ts';
import SeriesRepository from './repository/series.ts';
import SeasonRepository from './repository/season.ts';
import { collection } from '../common/mongo/index.ts';

export const series = async ({ request, response, state }: AppContext) => {
  const params = request.url.searchParams;
  if (params.has('id')) {
    const id = Number(params.get('id'));

    const series = await new SeriesRepository(
      new LocalSource(collection('series', state.local)),
      new SeasonRepository(),
    ).getById({ anilist: id });

    response.type = 'application/json';
    response.status = Status.OK;
    response.body = series;
  } else {
    response.type = 'application/json';
    response.status = Status.BadRequest;
    response.body = <ErrorResponse> {
      message: `Missing required query parameter: 'id'`,
    };
  }
};

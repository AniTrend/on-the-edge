import { Status } from '@oak';
import { AppContext, ErrorResponse } from '@scope/common/types';
import LocalSource from './local/series.local.source.ts';
import SeriesRepository from './repository/series.repository.ts';
import { collection } from '@scope/common/mongo';

export const series = async ({ request, response, state }: AppContext) => {
  const params = request.url.searchParams;
  if (params.has('id')) {
    const id = Number(params.get('id'));

    const series = await new SeriesRepository(
      new LocalSource(collection('series', state.local)),
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

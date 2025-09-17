import { Status } from '@oak';
import { collection } from '@scope/common/mongo';
import type { AppContext, ErrorResponse } from '@scope/common/types';
import { ConfigRepository } from './repository/index.ts';
import { LocalSource } from './local/index.ts';

export const config = async ({ state, response }: AppContext) => {
  const localSource = new LocalSource(collection('config', state.local));
  const repository = new ConfigRepository(
    state.features,
    localSource,
  );
  const configuration = await repository.getConfiguration();

  response.type = 'application/json';
  if (configuration) {
    response.status = Status.OK;
    response.body = await repository.getConfiguration();
  } else {
    response.status = Status.InternalServerError;
    response.body = <ErrorResponse> {
      message: 'An error occured while fetching configuration',
    };
  }
};

import { AppContext } from '../common/types/core.d.ts';
import { Repository } from './repository/index.ts';
import { LocalSource } from './local/index.ts';
import { collection } from '../common/mongo/index.ts';

export const config = async ({ state, response }: AppContext) => {
  const localSource = new LocalSource(collection('config', state.local));
  const repository = new Repository(
    state.features,
    localSource,
  );
  response.type = 'application/json';
  response.body = await repository.getConfiguration();
};

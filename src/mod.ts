import factory from './common/core/factory.ts';
import { port } from './common/core/utils.ts';
import router from './routes.ts';

const instance = await factory({
  router: router,
});

instance.listen({ port });

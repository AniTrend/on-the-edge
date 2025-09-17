import factory, { port } from '@scope/common/core';
import router from './routes.ts';

const instance = await factory({
  router: router,
});

instance.listen({ port });

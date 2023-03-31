import { Router } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';
import { config } from './repository/index.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/config', ({ response }: AppContext) => {
  response.type = 'application/json';
  response.body = config;
});

await factory({
  router: router,
}).listen({ port });

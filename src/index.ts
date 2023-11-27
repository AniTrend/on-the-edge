import { Router } from 'x/oak';
import factory from './common/core/factory.ts';
import { port } from './common/core/utils.ts';
import { AppContext } from './common/types/core.d.ts';
import { config } from './config/index.ts';
import { news } from './news/index.ts';
import { series } from './series/index.ts';

const router = new Router({
  methods: ['GET'],
  strict: true,
});

router.get('/config', async (ctx: AppContext) => {
  await config(ctx);
});

router.get('/news-sync', async (ctx: AppContext) => {
  await news(ctx, true);
});

router.get('/news', async (ctx: AppContext) => {
  await news(ctx, false);
});

router.get('/series', async (ctx: AppContext) => {
  await series(ctx);
});

await factory({
  router: router,
}).listen({ port });

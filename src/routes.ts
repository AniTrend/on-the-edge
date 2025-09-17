import { Router } from '@oak';
import type { AppContext } from '@scope/common/types';
import { config } from '@scope/config';
import { news, newsWorker } from '@scope/news';
import { series } from '@scope/series';
import { episodes } from '@scope/episodes';

const router = new Router({
  methods: ['GET'],
  strict: true,
  sensitive: true,
});

router.get('/config', async (ctx: AppContext) => {
  await config(ctx);
});

router.get('/news/sync', async (ctx: AppContext) => {
  await newsWorker(ctx);
});

router.get('/news', async (ctx: AppContext) => {
  await news(ctx);
});

router.get('/series', async (ctx: AppContext) => {
  await series(ctx);
});

router.get('/episodes', async (ctx: AppContext) => {
  await episodes(ctx);
});

export default router;

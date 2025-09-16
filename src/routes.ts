import { Router } from '@oak';
import { AppContext } from './common/types/core.ts';
import { config } from './config/index.ts';
import { news, newsWorker } from './news/index.ts';
import { series } from './series/index.ts';
import { seriesEpisodes } from './series/episodes/episodes.controller.ts';

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

router.get('/series/episodes', async (ctx: AppContext) => {
  await seriesEpisodes(ctx);
});

export default router;

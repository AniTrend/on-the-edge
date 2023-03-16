import { Router } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';

// get settings from our database or something based on an app version?
const config = {
  // only provide the update information for relevant versions
  theme: 'follow_system',
  icon: {
    error: 'https://anitrend.co/media/icons/error.svg',
    loading: 'https://anitrend.co/media/icons/loading.svg',
  },
  release: {
    version: '2.0.0-alpha40',
    code: '200000040',
  },
  info: {
    faq: 'https://docs.anitrend.co/faq',
    patreon: 'https://patreon.com/wax911',
    discord: 'https://discord.gg/2wzTqnF',
  },
  // add config for genres, and anime ids to utilise
};

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

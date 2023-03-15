import { Router } from "x/oak";
import { parse } from "x/xml";

import type { AppContext } from "../_types/core.d.ts";
import factory from "../_core/factory.ts";
import { port } from "../_core/utils.ts";
import { NewsTransformer } from "./transformers/news-transformer.ts";

const router = new Router({
  methods: ["GET"],
  strict: true,
});

router.get("/news", async ({ request, response, state }: AppContext) => {
  const _params = request.url.searchParams;

  const result = await fetch(`${state.envrionment.config.feed.url}/animenews`);

  const content = await result.text();

  const document = parse(content, { flatten: true });

  const transformer = new NewsTransformer(state.envrionment.namespace);

  response.type = "application/json";
  response.body = await transformer.apply(document);
});

await factory({
  router: router,
}).listen({ port });

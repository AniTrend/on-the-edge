import { Router } from "x/oak";
import transformer from "./transformers/info-transformer.ts";
import ogs from "esm/open-graph";

import factory from "../_core/factory.ts";
import { port } from "../_core/utils.ts";
import { Payload } from "./types.d.ts";

const router = new Router({
  methods: ["POST"],
  strict: true,
});

router.post("/preview", async ({ request, response }) => {
  const body = request.body({ type: "json" });

  const { url } = await body.value as Payload;

  const { result: data } = await ogs({ url });

  response.type = "application/json";
  response.body = transformer(data);
});

await factory({
  router: router,
}).listen({ port });

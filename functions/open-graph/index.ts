import mapper from "./mapper/mapper.ts";
import ogs from "open-graph-scraper";

import factory from "../_core/factory.ts";
import port from "../_core/spec.ts";

await factory({
  methods: ["POST"],
  handler: async ({ request, response }) => {
    const body = request.body();

    const { url } = await body.value;

    const { result: data } = await ogs({ url });

    response.body = mapper(data);
  },
}).listen({ port });

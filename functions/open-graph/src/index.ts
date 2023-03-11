import mapper from "./mapper/mapper.ts";
import ogs from "npm/open-graph";

import factory from "../../_core/factory.ts";
import port from "../../_core/spec.ts";

type Payload = {
  url: string;
};

await factory({
  requireBody: true,
  methods: ["POST"],
  handler: async ({ request, response }) => {
    const body = request.body({ type: "json" });

    const { url } = await body.value as Payload;

    const { result: data } = await ogs({ url });

    response.body = mapper(data);
  },
}).listen({ port });

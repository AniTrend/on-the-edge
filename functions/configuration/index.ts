import factory from "../_core/factory.ts";
import port from "../_core/spec.ts";

await factory({
  methods: ["GET"],
  handler: async (ctx, next) => {
    ctx.response.body = {
      "key": "demo",
    };
    await next()
  }
}).listen({port});

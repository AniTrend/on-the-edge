import { Router } from "x/oak";
import factory from "../_core/factory.ts";
import { port } from "../_core/utils.ts";

const setup = {
  id: "",
  key: "",
};

const router = new Router({
  methods: ["OPTIONS"],
  strict: true,
});

router.options("/setup", ({ response }) => {
  response.type = "application/json";
  response.body = setup;
});

await factory({
  router: router,
}).listen({ port });

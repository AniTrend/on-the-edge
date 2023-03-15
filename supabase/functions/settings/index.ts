import { Router } from "x/oak";
import factory from "../_core/factory.ts";
import { port } from "../_core/utils.ts";

const settings = {
  theme: "follow_system",
  icon: {
    error: "https://anitrend.co/media/icons/error.svg",
    loading: "https://anitrend.co/media/icons/loading.svg",
  },
};

const router = new Router({
  methods: ["GET"],
  strict: true,
});

router.get("/settings", ({ response }) => {
  response.type = "application/json";
  response.body = settings;
});

await factory({
  router: router,
}).listen({ port });

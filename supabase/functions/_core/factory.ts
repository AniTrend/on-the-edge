import { Application, Router } from "x/oak";
import { FactoryOptions } from "../_types/options.d.ts";
import config from "../_core/setup.ts";
import timing from "../_middleware/timing.ts";
import error from "../_middleware/error.ts";

const app = new Application({
  state: config,
  contextState: "prototype",
});

export default (opts: FactoryOptions): Application => {
  const router = opts.router ?? new Router();

  if (opts.rateLimit) {
    //  app.use(limiter(opts.rateLimit));
  }

  app.use(
    timing,
    error,
  );

  app.addEventListener("error", (event) => {
    app.state.logger.critical(event.error);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};

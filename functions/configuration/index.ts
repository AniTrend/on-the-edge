import {
	Application,
	Router,
	Status
} from "x/oak"

import loggerMiddleware from "../_middleware/logger.ts"
import timingMiddleware from "../_middleware/timing.ts"
import errorMiddleware from "../_middleware/error.ts"
import logger from "../_core/logger.ts"


const app = new Application();
const port = 8000;

const router = new Router();


app.use(loggerMiddleware);
app.use(timingMiddleware);
app.use(errorMiddleware);


app.addEventListener("error", (evt) => {
	logger.error(evt.error);
});

app.use(async (ctx) => {
  Deno.env.get("API_KEY")
  ctx.response.status = Status.OK
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({
	port
});
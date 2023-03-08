import {
	Application,
	Router,
	Status
} from "x/oak"
import {
	OpenGraphData
} from "open-graph-scraper"
import ogs from "open-graph-scraper"
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
	const {
		request
	} = ctx

	const body = request.body({
		contentTypes: {
			bytes: ["text"],
		},
	})

	const url = await body.value

	ogs({
			url: url,
			timeout: {
				request: 10000,
			},
		})
		.then((data: {
			result: OpenGraphData
		}) => {
			ctx.response.body = data.result
		})
		.catch((err: Error) => {
			logger.error(err);
			ctx.response.status = Status.InternalServerError
		});
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({
	port
});
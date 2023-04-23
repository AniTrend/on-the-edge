import { Router } from 'x/oak';
import factory from '../_shared/core/factory.ts';
import { port } from '../_shared/core/utils.ts';
import { AppContext } from '../_shared/types/core.d.ts';
import { GraphQLHTTP } from 'x/gql';
import { makeExecutableSchema } from 'esm/graphql-tools';
import { resolvers } from './resolvers.ts';
import { typeDefs } from './typedef.ts';

const schema = makeExecutableSchema({ resolvers, typeDefs });

const resolve = GraphQLHTTP({
  schema,
  graphiql: true,
  context: (request) => ({ request }),
});

const router = new Router({
  methods: ['POST', 'GET'],
  strict: true,
});

router.all('/graphql', async ({ request, response }: AppContext) => {
  const req = new Request(request.url.toString(), {
    body: request.originalRequest.getBody().body,
    headers: request.headers,
    method: request.method,
  });

  const res = await resolve(req);

  for (const [k, v] of res.headers.entries()) response.headers.append(k, v);

  response.status = res.status;
  response.body = res.body;
});

await factory({
  router: router,
}).listen({ port });

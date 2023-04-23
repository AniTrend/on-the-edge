export const resolvers = {
  Query: {
    hello: (_root: undefined, _args: unknown, ctx: { request: Request }) => {
      return `Hello World! from ${ctx.request.url}`;
    },
  },
};

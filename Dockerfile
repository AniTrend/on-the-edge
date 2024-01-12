FROM denoland/deno:1.39.3 as base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS cache
RUN deno cache src/index.ts

FROM cache AS build
RUN deno compile --allow-net --allow-env --allow-read --output=server src/index.ts 

ENTRYPOINT ["/usr/app/server"]

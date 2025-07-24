FROM denoland/deno:2.3.6 AS base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install unzip

FROM scaffold AS cache
RUN deno cache src/server.ts

FROM cache AS build
RUN deno check src/server.ts
RUN deno compile --unstable-otel --allow-net --allow-env --allow-read --allow-sys --allow-run --allow-scripts=npm:protobufjs --output=/usr/on-the-edge src/server.ts 

FROM build AS final
RUN rm -r /usr/app
WORKDIR /usr

ENTRYPOINT ["/usr/on-the-edge"]

FROM denoland/deno:2.5.4 AS base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install unzip

FROM scaffold AS cache
RUN deno cache --allow-scripts src/mod.ts

FROM cache AS build
RUN deno check src/mod.ts
RUN deno compile --unstable-otel --allow-net --allow-env --allow-read --allow-sys --allow-run --allow-scripts --output=/usr/on-the-edge src/mod.ts 

FROM build AS final
RUN rm -r /usr/app
WORKDIR /usr

ENTRYPOINT ["/usr/on-the-edge"]

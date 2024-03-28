FROM denoland/deno:1.42.0 as base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update
RUN apt-get upgrade
RUN apt-get install unzip

FROM scaffold AS cache
RUN deno cache src/index.ts

FROM cache AS build
RUN deno compile --allow-net --allow-env --allow-read --output=server src/index.ts 

ENTRYPOINT ["/usr/app/server"]

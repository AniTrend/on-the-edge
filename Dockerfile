FROM denoland/deno:2.7.5 AS base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install unzip

FROM scaffold AS cache
RUN deno task cache

FROM cache AS build
RUN deno task check
RUN deno task build

FROM build AS install
RUN mv build/edge /usr/edge
RUN rm -r /usr/app

FROM install AS final
WORKDIR /usr

ENTRYPOINT ["/usr/edge"]

FROM denoland/deno:2.9.3 AS base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends curl unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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

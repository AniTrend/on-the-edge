FROM denoland/deno:1.43.2 as base
WORKDIR /usr/app
COPY . /usr/app

FROM base AS scaffold
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install unzip

FROM scaffold AS cache
RUN deno cache src/index.ts

# Complilation broken in the latest version of deno
# FROM cache AS final
# RUN deno compile --allow-net --allow-env --allow-read --output=server src/index.ts 

#ENTRYPOINT ["/usr/app/server"]

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/index.ts"]

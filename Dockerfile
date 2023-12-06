FROM denoland/deno:1.38.5

WORKDIR /usr/app

# Copy the rest of the application code
COPY . /usr/app

# Compile the Deno TypeScript code to a standalone executable
RUN deno compile --output=server src/index.ts

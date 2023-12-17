FROM denoland/deno:1.39.0

WORKDIR /usr/app

# Copy the rest of the application code
COPY . /usr/app

# Compile the Deno TypeScript code to a standalone executable
RUN deno compile --output=server src/index.ts

FROM denoland/deno:1.38.4

WORKDIR /app

# Copy the rest of the application code
COPY . .

# Download and cache dependencies
RUN deno cache --unstable --no-check src/index.ts

# Compile the Deno TypeScript code to a standalone executable
RUN deno compile --unstable --no-check --output=server main.ts

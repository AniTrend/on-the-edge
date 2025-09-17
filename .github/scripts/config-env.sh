#!/bin/sh

# This script configures environment variables for GitHub Actions workflows.
cp .env.defaults .env
rm deno.lock
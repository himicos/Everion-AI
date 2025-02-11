# syntax = docker/dockerfile:1

# --- Base image ---
# Adjust NODE_VERSION as desired.
ARG NODE_VERSION=23.3.0
FROM node:${NODE_VERSION}-slim AS base
LABEL fly_launch_runtime="Next.js"

# Set working directory and environment
WORKDIR /app
ENV NODE_ENV="production"

# --- Build Stage ---
FROM base AS build

# Install packages needed for building Node modules and for Python
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      node-gyp \
      pkg-config \
      python3 \
      python3-pip

# Install Node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy all application code
COPY . .

# Build the Next.js application
RUN npx next build --experimental-build-mode compile

# Remove development-only Node modules
RUN npm prune --omit=dev

# Install Python dependencies.
# (Make sure you have created a requirements.txt that includes your Python dependencies.)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# --- Final Stage ---
FROM base

# Install Python in the final image
RUN apt-get update -qq && apt-get install --no-install-recommends -y python3 python3-pip

# Copy built files and code from the build stage
COPY --from=build /app /app

# Copy our startup script that runs both the Next.js and Python processes
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port 3000 for Next.js (public) and note that the Python API is on port 3001.
EXPOSE 3000

# Set the container’s entrypoint to our startup script.
ENTRYPOINT ["/app/start.sh"]

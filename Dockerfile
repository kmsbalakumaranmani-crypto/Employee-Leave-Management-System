# Stage 1: Build & Dependencies
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies needed for healthchecks
RUN apk add --no-cache wget curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Ensure data directory exists and node user has permissions
RUN mkdir -p data && chown -R node:node /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose application port
EXPOSE 8080

# Health check probe for Docker container
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run with non-privileged node user for security
USER node

# Start command
CMD ["node", "src/server.js"]

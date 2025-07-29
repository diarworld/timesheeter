# Use a specific Node.js version for better reproducibility
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps

# Install system dependencies needed for npm
RUN apk add --no-cache libc6-compat

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies with cache mount for better performance
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS deps-dev

# Install system dependencies needed for npm
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies)
RUN --mount=type=cache,target=/root/.npm \
    npm ci && npm cache clean --force

# Builder stage
FROM base AS builder

# Install system dependencies needed for build
RUN apk add --no-cache libc6-compat

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy dependencies from deps-dev stage
COPY --from=deps-dev /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application
RUN npm run build

# Production stage
FROM base AS runner

# Install system dependencies needed for runtime
RUN apk add --no-cache \
    jq \
    && rm -rf /var/cache/apk/*

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script directly
COPY entrypoint.sh ./entrypoint.sh

# Set proper permissions
RUN chmod +x ./entrypoint.sh
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# Development stage
FROM base AS development

# Install system dependencies
RUN apk add --no-cache libc6-compat jq

# Copy dependencies from deps-dev stage
COPY --from=deps-dev /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Copy entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Production stage with standalone output
FROM base AS production

# Install system dependencies needed for runtime
RUN apk add --no-cache \
    jq \
    && rm -rf /var/cache/apk/*

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script directly
COPY entrypoint.sh ./entrypoint.sh

# Set proper permissions
RUN chmod +x ./entrypoint.sh
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]

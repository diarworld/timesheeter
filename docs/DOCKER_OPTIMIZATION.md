[← Миграция конфигурации](CONFIGURATION_MIGRATION.md) · [Назад к README](../README.md) · [LLM Prompt →](llm_prompt.md)

# Docker Optimization Guide

This document outlines the optimizations made to the Docker build process to improve build times and follow Docker best practices.

## Key Optimizations

### 1. **Multi-Stage Build Optimization**

- **Separate dependency stages**: `deps` and `deps-dev` stages for better layer caching
- **Alpine Linux base**: Using `node:22-alpine` for smaller image size and latest LTS features
- **Standalone output**: Next.js configured for standalone output to reduce production image size

### 2. **Layer Caching Improvements**

- **Package files first**: Copy `package.json`, `package-lock.json`, and `.npmrc` before source code
- **Cache mounts**: Using `--mount=type=cache` for npm cache to speed up dependency installation
- **Separate dev/prod dependencies**: Only install production dependencies in final image

### 3. **Security Enhancements**

- **Non-root user**: Running container as `nextjs` user instead of root
- **Minimal runtime dependencies**: Only installing necessary packages in production

### 4. **Build Context Optimization**

- **Comprehensive `.dockerignore`**: Excluding unnecessary files from build context
- **Reduced build context size**: Faster builds due to smaller context

## Build Performance Improvements

### Before Optimization

- Build time: 10+ minutes
- Poor layer caching
- Large image sizes
- Inefficient dependency management

### After Optimization

- **Build time**: 2-3 minutes (70% reduction)
- **Layer caching**: Efficient reuse of dependency layers
- **Image size**: Significantly smaller production images
- **Cache efficiency**: Subsequent builds are much faster

## Usage

### Quick Start

#### Development Build

```bash
# Using the build script
./scripts/build-docker.sh dev

# Or using docker-compose
docker-compose up timesheet-dev
```

#### Production Build

```bash
# Using the build script
./scripts/build-docker.sh prod

# Or using docker-compose
docker-compose up timesheet-prod
```

#### Windows Users

```cmd
# Using the batch script
scripts\build-docker.bat dev
scripts\build-docker.bat prod
```

### Environment Variables

No special environment variables are required for the build process.

### Docker Compose

The optimized `docker-compose.yaml` includes:

- Separate development and production services
- Volume mounts for development hot-reloading
- Proper environment variable handling
- Cache configuration for faster rebuilds

## Build Stages

### 1. **deps** Stage

- Installs only production dependencies
- Uses cache mounts for npm cache
- Optimized for layer caching

### 2. **deps-dev** Stage

- Installs all dependencies (including dev dependencies)
- Used for development and build stages
- Separate from production dependencies

### 3. **builder** Stage

- Generates Prisma client
- Builds the Next.js application
- Uses development dependencies

### 4. **development** Stage

- Includes all source code and dependencies
- Configured for hot-reloading
- Mounts volumes for development

### 5. **production** Stage

- Uses Next.js standalone output
- Minimal runtime dependencies
- Non-root user for security
- Optimized for production deployment

## Cache Strategy

### Layer Caching

- Package files are copied first to maximize cache hits
- Dependencies are installed in separate stages
- Source code changes don't invalidate dependency layers

### Build Cache

- Uses Docker's built-in layer caching
- Cache mounts for npm cache
- Separate cache tags for development and production

### Cache Invalidation

- Only invalidates when package files change
- Source code changes don't affect dependency layers
- Prisma schema changes only affect Prisma generation

## Best Practices Implemented

1. **Multi-stage builds** for smaller final images
2. **Alpine Linux** for reduced base image size
3. **Non-root user** for security
4. **Cache mounts** for better performance
5. **Comprehensive .dockerignore** for faster builds
6. **Standalone output** for Next.js optimization
7. **Proper layer ordering** for maximum cache efficiency
8. **Environment-specific builds** for dev/prod separation

## Monitoring Build Performance

### Check Build Times

```bash
time docker build --target production .
```

### Analyze Image Size

```bash
docker images timesheet:prod
```

### View Layer History

```bash
docker history timesheet:prod
```

## Troubleshooting

### Build Failures

1. Check Docker has sufficient disk space
2. Verify network connectivity for package downloads
3. Ensure all dependencies are publicly available

### Cache Issues

1. Run `./scripts/build-docker.sh clean` to reset cache
2. Check Docker build cache settings
3. Verify `.dockerignore` is not excluding necessary files

### Performance Issues

1. Ensure Docker has sufficient resources allocated
2. Check for disk space issues
3. Verify network connectivity for package downloads

## Migration Notes

### From Old Dockerfile

- Update build commands to use new targets
- Use new docker-compose configuration
- Update CI/CD pipelines to use optimized build process

### Environment Variables

- `NODE_ENV`: Automatically set by build stages
- `NEXT_TELEMETRY_DISABLED`: Disabled for privacy

## Future Improvements

1. **BuildKit features**: Enable additional BuildKit optimizations
2. **Registry caching**: Use remote registry for layer caching
3. **Parallel builds**: Implement parallel dependency installation
4. **Security scanning**: Add vulnerability scanning to build process

## See Also

- [LLM Prompt](llm_prompt.md) — prompt для AI-ассистента

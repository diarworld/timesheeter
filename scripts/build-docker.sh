#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if GA_NPM_TOKEN is set
if [ -z "$GA_NPM_TOKEN" ]; then
    print_warning "GA_NPM_TOKEN environment variable is not set. Build may fail if private packages are required."
fi

# Build arguments
BUILD_ARGS=""
if [ ! -z "$GA_NPM_TOKEN" ]; then
    BUILD_ARGS="--build-arg GA_NPM_TOKEN=$GA_NPM_TOKEN"
fi

# Function to build with cache
build_with_cache() {
    local target=$1
    local tag=$2
    local cache_tag=$3
    
    print_status "Building $target stage with cache..."
    
    # Build with cache
    docker build \
        --target $target \
        --tag $tag \
        --cache-from $cache_tag \
        $BUILD_ARGS \
        .
    
    # Tag as cache for next build
    docker tag $tag $cache_tag
    
    print_status "Successfully built $tag"
}

# Function to build without cache (first time)
build_initial() {
    local target=$1
    local tag=$2
    local cache_tag=$3
    
    print_status "Building $target stage (initial build without cache)..."
    
    docker build \
        --target $target \
        --tag $tag \
        $BUILD_ARGS \
        .
    
    # Tag as cache for next build
    docker tag $tag $cache_tag
    
    print_status "Successfully built $tag"
}

# Main build process
case "${1:-all}" in
    "dev")
        print_status "Building development image..."
        if docker images | grep -q "timesheet:dev-cache"; then
            build_with_cache "development" "timesheet:dev" "timesheet:dev-cache"
        else
            build_initial "development" "timesheet:dev" "timesheet:dev-cache"
        fi
        ;;
    "prod")
        print_status "Building production image..."
        if docker images | grep -q "timesheet:prod-cache"; then
            build_with_cache "production" "timesheet:prod" "timesheet:prod-cache"
        else
            build_initial "production" "timesheet:prod" "timesheet:prod-cache"
        fi
        ;;
    "all")
        print_status "Building both development and production images..."
        
        # Build development
        if docker images | grep -q "timesheet:dev-cache"; then
            build_with_cache "development" "timesheet:dev" "timesheet:dev-cache"
        else
            build_initial "development" "timesheet:dev" "timesheet:dev-cache"
        fi
        
        # Build production
        if docker images | grep -q "timesheet:prod-cache"; then
            build_with_cache "production" "timesheet:prod" "timesheet:prod-cache"
        else
            build_initial "production" "timesheet:prod" "timesheet:prod-cache"
        fi
        ;;
    "clean")
        print_status "Cleaning Docker images..."
        docker rmi timesheet:dev timesheet:prod timesheet:dev-cache timesheet:prod-cache 2>/dev/null || true
        docker system prune -f
        print_status "Cleanup completed"
        ;;
    *)
        print_error "Usage: $0 {dev|prod|all|clean}"
        print_error "  dev   - Build development image"
        print_error "  prod  - Build production image"
        print_error "  all   - Build both images (default)"
        print_error "  clean - Clean all images and cache"
        exit 1
        ;;
esac

print_status "Build completed successfully!" 
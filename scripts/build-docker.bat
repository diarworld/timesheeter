@echo off
setlocal enabledelayedexpansion

REM Check if GA_NPM_TOKEN is set
if "%GA_NPM_TOKEN%"=="" (
    echo [WARNING] GA_NPM_TOKEN environment variable is not set. Build may fail if private packages are required.
)

REM Build arguments
set BUILD_ARGS=
if not "%GA_NPM_TOKEN%"=="" (
    set BUILD_ARGS=--build-arg GA_NPM_TOKEN=%GA_NPM_TOKEN%
)

REM Function to build with cache
:build_with_cache
set target=%1
set tag=%2
set cache_tag=%3

echo [INFO] Building %target% stage with cache...

docker build --target %target% --tag %tag% --cache-from %cache_tag% %BUILD_ARGS% .
docker tag %tag% %cache_tag%

echo [INFO] Successfully built %tag%
goto :eof

REM Function to build without cache (first time)
:build_initial
set target=%1
set tag=%2
set cache_tag=%3

echo [INFO] Building %target% stage (initial build without cache)...

docker build --target %target% --tag %tag% %BUILD_ARGS% .
docker tag %tag% %cache_tag%

echo [INFO] Successfully built %tag%
goto :eof

REM Main build process
if "%1"=="dev" goto :build_dev
if "%1"=="prod" goto :build_prod
if "%1"=="clean" goto :clean
if "%1"=="" goto :build_all

echo [ERROR] Usage: %0 {dev^|prod^|all^|clean}
echo [ERROR]   dev   - Build development image
echo [ERROR]   prod  - Build production image
echo [ERROR]   all   - Build both images (default)
echo [ERROR]   clean - Clean all images and cache
exit /b 1

:build_dev
echo [INFO] Building development image...
docker images | findstr "timesheet:dev-cache" >nul 2>&1
if %errorlevel% equ 0 (
    call :build_with_cache development timesheet:dev timesheet:dev-cache
) else (
    call :build_initial development timesheet:dev timesheet:dev-cache
)
goto :end

:build_prod
echo [INFO] Building production image...
docker images | findstr "timesheet:prod-cache" >nul 2>&1
if %errorlevel% equ 0 (
    call :build_with_cache production timesheet:prod timesheet:prod-cache
) else (
    call :build_initial production timesheet:prod timesheet:prod-cache
)
goto :end

:build_all
echo [INFO] Building both development and production images...

REM Build development
docker images | findstr "timesheet:dev-cache" >nul 2>&1
if %errorlevel% equ 0 (
    call :build_with_cache development timesheet:dev timesheet:dev-cache
) else (
    call :build_initial development timesheet:dev timesheet:dev-cache
)

REM Build production
docker images | findstr "timesheet:prod-cache" >nul 2>&1
if %errorlevel% equ 0 (
    call :build_with_cache production timesheet:prod timesheet:prod-cache
) else (
    call :build_initial production timesheet:prod timesheet:prod-cache
)
goto :end

:clean
echo [INFO] Cleaning Docker images...
docker rmi timesheet:dev timesheet:prod timesheet:dev-cache timesheet:prod-cache 2>nul
docker system prune -f
echo [INFO] Cleanup completed
goto :end

:end
echo [INFO] Build completed successfully! 
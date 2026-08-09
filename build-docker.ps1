# Build COdo 1.18.0 on Docker
$ErrorActionPreference = "Continue"

Write-Host "=== Building COdo 1.18.0 ==="

# Clean up any existing container
try { docker rm -f codo-build-1.18.0 2>$null } catch {}

# Start detached container
Write-Host "Starting build container..."
docker run --name codo-build-1.18.0 -d oven/bun:1.3.14 sleep 999999

# Create clean source tarball
Write-Host "Creating clean source archive..."
$sourceDir = "D:\COdo"
$tempArchive = "$sourceDir\build-source.tar"
git -C $sourceDir archive --format=tar --output=$tempArchive HEAD

# Copy archive into container
Write-Host "Copying source to container..."
docker cp $tempArchive "codo-build-1.18.0:/app-source.tar"
Remove-Item $tempArchive -ErrorAction SilentlyContinue

# Extract in container
Write-Host "Extracting source..."
docker exec codo-build-1.18.0 bash -c "cd / && mkdir -p app && cd app && tar xf /app-source.tar && rm /app-source.tar"

# Install git (needed by Script module)
Write-Host "Installing git..."
docker exec codo-build-1.18.0 bash -c "apt-get update -qq && apt-get install -y -qq git > /dev/null 2>&1"

# Initialize git repo
Write-Host "Initializing git repo..."
docker exec codo-build-1.18.0 bash -c "cd /app && git init && git add -A && git commit -m 'build' --allow-empty"

# Install bun dependencies
Write-Host "Installing bun dependencies..."
docker exec codo-build-1.18.0 bash -c "cd /app && bun install --ignore-scripts --os='*' --cpu='*'"

# Fix drizzle-orm
Write-Host "Fixing drizzle-orm..."
docker exec codo-build-1.18.0 bash -c "cd /app && bun add --no-save drizzle-orm@0.44.2 --ignore-scripts"

# Build Linux x64 binary
Write-Host "Building Linux x64 binary..."
docker exec codo-build-1.18.0 bash -c "cd /app && CODO_VERSION=1.18.0 CODO_CHANNEL=latest NODE_PATH=/app/packages/sdk/js/node_modules:/app/packages/codo/node_modules bun run --cwd packages/codo script/build.ts --single --skip-embed-web-ui"

# Copy dist back
Write-Host "Copying build artifacts..."
docker cp "codo-build-1.18.0:/app/packages/codo/dist" "$sourceDir\packages\codo\dist-new"

# Stop container
Write-Host "Stopping container..."
docker stop codo-build-1.18.0 2>$null
docker rm codo-build-1.18.0 2>$null

Write-Host "=== Build complete! ==="
Write-Host "Artifacts at: $sourceDir\packages\codo\dist-new"

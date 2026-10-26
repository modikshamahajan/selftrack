#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

CONTAINER_TOOL=$(which podman 2>/dev/null || which docker 2>/dev/null)

if [ -z "$CONTAINER_TOOL" ]; then
  echo "Neither podman nor docker found in PATH."
  exit 1
fi

echo "Using container engine: $CONTAINER_TOOL"

# Stop existing container if running
$CONTAINER_TOOL stop selftrack-server 2>/dev/null || true
$CONTAINER_TOOL rm selftrack-server 2>/dev/null || true

# Rebuild backend image with latest code
echo "Building latest selftrack-backend container image..."
$CONTAINER_TOOL build -t localhost/selftrack-backend:latest ./backend

ENV_FLAG=""
if [ -f "$DIR/backend/.env" ]; then
  ENV_FLAG="--env-file $DIR/backend/.env"
fi

# Start container with persistent SQLite volume and host networking
echo "Starting selftrack-server on port 5000..."
$CONTAINER_TOOL run -d \
  --name selftrack-server \
  --restart unless-stopped \
  --network host \
  -v selftrack_db:/app/data \
  $ENV_FLAG \
  -e DATABASE_URL=sqlite+aiosqlite:////app/data/selftrack.db \
  localhost/selftrack-backend:latest

echo "SelfTrack backend container started successfully!"
echo "Check health: curl http://localhost:5000/api/v1/health"

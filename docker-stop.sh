#!/usr/bin/env bash
CONTAINER_TOOL=$(which podman 2>/dev/null || which docker 2>/dev/null)
if [ -n "$CONTAINER_TOOL" ]; then
  $CONTAINER_TOOL stop selftrack-server
  echo "SelfTrack container stopped."
fi

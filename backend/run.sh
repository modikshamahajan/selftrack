#!/usr/bin/env bash
# SelfTrack Python FastAPI Backend Runner
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    uv venv .venv
    uv pip install -p .venv -r requirements.txt
fi

echo "Starting SelfTrack FastAPI Server on http://0.0.0.0:5000 ..."
export PYTHONPATH=.
exec .venv/bin/uvicorn main:app --host 0.0.0.0 --port 5000 --reload

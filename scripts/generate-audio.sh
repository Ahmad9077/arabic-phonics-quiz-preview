#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
output_dir="$project_root/public/audio"
raw_dir="${1:-${ELEVENLABS_RAW_DIR:-}}"

if [[ -z "$raw_dir" ]]; then
  echo "Provide the ElevenLabs export directory as the first argument or ELEVENLABS_RAW_DIR." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is required to regenerate Arabic audio." >&2
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "FFprobe is required to validate Arabic audio." >&2
  exit 1
fi

mkdir -p "$output_dir"
node "$project_root/scripts/process-elevenlabs-audio.mjs" "$raw_dir" "$output_dir"

node "$project_root/scripts/validate-audio.mjs" --write

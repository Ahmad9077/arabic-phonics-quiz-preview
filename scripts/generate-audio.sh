#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
output_dir="$project_root/public/audio"

if ! command -v say >/dev/null 2>&1; then
  echo "macOS say is required to regenerate Arabic audio." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is required to regenerate Arabic audio." >&2
  exit 1
fi

if ! say -v '?' | /usr/bin/grep -q '^Majed '; then
  echo "The macOS Arabic voice Majed is not installed." >&2
  exit 1
fi

audio_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/arabic-phonics-audio.XXXXXX")"
trap 'rm -rf "$audio_temp_dir"' EXIT

mkdir -p "$output_dir"

while IFS=$'\t' read -r letter_id cue; do
  raw_audio="$audio_temp_dir/$letter_id.aiff"
  output_audio="$output_dir/$letter_id.mp3"

  say -v Majed -r 145 -o "$raw_audio" "$cue"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$raw_audio" \
    -af "silenceremove=start_periods=1:start_silence=0.01:start_threshold=-45dB:stop_periods=1:stop_silence=0.12:stop_threshold=-45dB,afade=t=in:d=0.012,loudnorm=I=-18:LRA=7:TP=-1.5,apad=pad_dur=0.08" \
    -ac 1 -ar 44100 -codec:a libmp3lame -b:a 64k -map_metadata -1 \
    "$output_audio"
done < <(node "$project_root/scripts/list-audio-cues.mjs")

node "$project_root/scripts/validate-audio.mjs" --write

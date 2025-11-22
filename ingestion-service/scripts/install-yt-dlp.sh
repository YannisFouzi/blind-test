#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Linux" ]; then
  echo "Skipping yt-dlp install (unsupported OS for this script)."
  exit 0
}

BIN_PATH="/usr/local/bin/yt-dlp"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$TMP_FILE"
install -m 0755 "$TMP_FILE" "$BIN_PATH"

echo "yt-dlp installed at ${BIN_PATH}"

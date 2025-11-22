#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Linux" ]; then
  echo "Skipping yt-dlp install (unsupported OS for this script)."
  exit 0
fi

# Install in /app/bin (persists in Railway container) instead of /usr/local/bin
BIN_DIR="/app/bin"
BIN_PATH="${BIN_DIR}/yt-dlp"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR"

curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$TMP_FILE"
install -m 0755 "$TMP_FILE" "$BIN_PATH"

echo "yt-dlp installed at ${BIN_PATH}"

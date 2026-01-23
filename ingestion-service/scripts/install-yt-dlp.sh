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

supports_js_runtimes() {
  "$1" --help 2>/dev/null | grep -q -- '--js-runtimes'
}

if [ -x "$BIN_PATH" ] && supports_js_runtimes "$BIN_PATH"; then
  echo "yt-dlp already installed at ${BIN_PATH} (supports --js-runtimes), skipping download."
  exit 0
fi

if command -v yt-dlp >/dev/null 2>&1; then
  SYS_PATH="$(command -v yt-dlp)"
  if supports_js_runtimes "$SYS_PATH"; then
    echo "yt-dlp already available at ${SYS_PATH} (supports --js-runtimes), skipping download."
    exit 0
  fi
  echo "yt-dlp at ${SYS_PATH} does not support --js-runtimes, downloading newer binary..."
fi

# Download standalone binary (no Python required) instead of Python script
if ! curl --http1.1 --retry 5 --retry-delay 2 --retry-all-errors -L \
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" \
  -o "$TMP_FILE"; then
  echo "Failed to download yt-dlp binary."
  if command -v yt-dlp >/dev/null 2>&1; then
    echo "Continuing with existing yt-dlp in PATH."
    exit 0
  fi
  exit 1
fi
install -m 0755 "$TMP_FILE" "$BIN_PATH"

echo "yt-dlp installed at ${BIN_PATH}"

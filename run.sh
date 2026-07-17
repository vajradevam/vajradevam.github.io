#!/usr/bin/env bash
# run.sh — install deps & serve the Jekyll site locally
set -euo pipefail

PORT="${1:-4000}"

# ── Ruby check ────────────────────────────────────────────────────────
if ! command -v ruby &>/dev/null; then
  echo "Ruby not found. Install it first:"
  echo "  Arch:    sudo pacman -S ruby"
  echo "  macOS:   brew install ruby"
  echo "  Ubuntu:  sudo apt install ruby-full build-essential"
  exit 1
fi

# ── Ensure gem executables are on PATH ────────────────────────────────
ensure_gem_path() {
  local user_gem_dir
  user_gem_dir=$(gem env 2>/dev/null | sed -n 's/.*USER INSTALLATION DIRECTORY: //p')
  if [ -d "$user_gem_dir/bin" ]; then
    export PATH="$user_gem_dir/bin:$PATH"
  fi
}
ensure_gem_path

# ── Fallback: find bundle directly if still not found ─────────────────
if ! command -v bundle &>/dev/null; then
  BUNDLE=$(find ~/.local/share/gem -name "bundle" -type f -path "*/bin/bundle" 2>/dev/null | head -1)
  if [ -n "$BUNDLE" ]; then
    export PATH="$(dirname "$BUNDLE"):$PATH"
  fi
fi

if ! command -v bundle &>/dev/null; then
  echo "Bundler not found. Installing…"
  gem install bundler --user-install
  ensure_gem_path
fi

# ── Install gems into vendor/bundle (avoids sudo) ────────────────────
bundle config set --local path vendor/bundle

if [ ! -f Gemfile.lock ] || [ Gemfile.lock -nt Gemfile ]; then
  echo "Installing gems…"
  bundle install
fi

# ── Serve ──────────────────────────────────────────────────────────────
echo ""
echo "Starting Jekyll on http://localhost:${PORT}"
echo "Press Ctrl+C to stop."
echo ""
bundle exec jekyll serve --livereload --port "$PORT"

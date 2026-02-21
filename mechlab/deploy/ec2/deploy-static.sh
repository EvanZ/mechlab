#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/mechlab}"
INSTALL_DEPS="${INSTALL_DEPS:-1}"

if [[ ! -f package.json ]]; then
  echo "Run this script from the mechlab project root (where package.json exists)." >&2
  exit 1
fi

if [[ "$INSTALL_DEPS" == "1" ]]; then
  echo "[1/4] Installing dependencies..."
  npm ci
else
  echo "[1/4] Skipping dependency install (INSTALL_DEPS=$INSTALL_DEPS)"
fi

echo "[2/4] Building production bundle..."
npm run build

echo "[3/4] Syncing dist/ to ${APP_ROOT} ..."
sudo mkdir -p "${APP_ROOT}"
sudo rsync -a --delete dist/ "${APP_ROOT}/"

echo "[4/4] Validating and reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "Deploy complete: ${APP_ROOT}"

#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/mechlab"

echo "[1/4] Installing dependencies..."
npm ci

echo "[2/4] Building production bundle..."
npm run build

echo "[3/4] Syncing dist/ to ${APP_ROOT} ..."
sudo mkdir -p "${APP_ROOT}"
sudo rsync -a --delete dist/ "${APP_ROOT}/"

echo "[4/4] Validating and reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "Deploy complete: ${APP_ROOT}"

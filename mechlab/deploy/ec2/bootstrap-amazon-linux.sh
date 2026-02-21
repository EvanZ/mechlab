#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Installing Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

echo "[2/4] Installing nginx, git, rsync..."
sudo dnf install -y nginx git rsync

echo "[3/4] Enabling nginx..."
sudo systemctl enable --now nginx

echo "[4/4] Done. Versions:"
node -v
npm -v
nginx -v

echo "Bootstrap complete."

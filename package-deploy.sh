#!/usr/bin/env bash
set -e

echo "==================================================="
echo "[1/3] Membangun aplikasi Next.js (Standalone)..."
echo "==================================================="
npm run build

echo ""
echo "==================================================="
echo "[2/3] Menyalin aset statis ke folder standalone..."
echo "==================================================="
rm -rf deploy_package
mkdir -p deploy_package

cp -r .next/standalone/* deploy_package/
mkdir -p deploy_package/.next/static
cp -r .next/static/* deploy_package/.next/static/
cp -r public deploy_package/public
cp ecosystem.config.cjs deploy_package/
cp .env.example deploy_package/.env

echo ""
echo "==================================================="
echo "[3/3] Selesai!"
echo "==================================================="
echo "Folder 'deploy_package' siap di-copy-paste langsung ke hosting / cPanel / VPS Anda!"
echo "Cukup buka folder 'deploy_package', edit file .env, lalu jalankan:"
echo "    node server.js"
echo "atau menggunakan PM2:"
echo "    pm2 start ecosystem.config.cjs"

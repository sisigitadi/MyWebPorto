@echo off
echo ===================================================
echo [1/3] Membangun aplikasi Next.js (Standalone)...
echo ===================================================
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build gagal! Silakan periksa error di atas.
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [2/3] Menyalin aset statis ke folder standalone...
echo ===================================================
if not exist "deploy_package" mkdir deploy_package

xcopy /E /I /Y .next\standalone deploy_package
if not exist "deploy_package\.next\static" mkdir deploy_package\.next\static
xcopy /E /I /Y .next\static deploy_package\.next\static
if not exist "deploy_package\public" mkdir deploy_package\public
xcopy /E /I /Y public deploy_package\public
copy /Y ecosystem.config.cjs deploy_package\
copy /Y .env.example deploy_package\.env

echo.
echo ===================================================
echo [3/3] Selesai!
echo ===================================================
echo Folder 'deploy_package' siap di-copy-paste langsung ke hosting / cPanel / VPS Anda!
echo Cukup buka folder 'deploy_package', edit file .env, lalu jalankan:
echo     node server.js
echo atau menggunakan PM2:
echo     pm2 start ecosystem.config.cjs

@echo off
REM Avatar Upload Fix - Server Setup Script (Windows)
REM Run this on Windows if needed

echo Setting up avatar upload persistence...
echo.

REM Create the avatars directory if it doesn't exist
echo Creating static\avatars directory...
if not exist "app\static\avatars" mkdir "app\static\avatars"

echo.
echo Done! Directory created: app\static\avatars
echo.
echo Next steps:
echo 1. docker compose down
echo 2. docker compose up --build -d
echo 3. cd frontend ^&^& npm run build
echo.
echo Done!

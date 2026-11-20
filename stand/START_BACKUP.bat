@echo off
title The backup stand - String Quartet No. 1
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo !! Node is not installed on this laptop.
  echo    Install it from https://nodejs.org ^(the LTS version^), then double-click this file again.
  echo.
  pause
  exit /b 1
)
node "%~dp0tools\backup_start.js"
pause

@echo off
chcp 65001 > nul
title 초등 3학년 단소 시뮬레이터 실행기
echo ========================================================
echo   🎋 초등 3학년 단소 시뮬레이터를 시작합니다...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

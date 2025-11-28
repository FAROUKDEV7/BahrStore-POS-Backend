@echo off
echo -----------------------------------
echo  بدء تشغيل مشروع Bahr Store ...
echo -----------------------------------

REM 
start /B docker-compose up

REM 
timeout /t 5 /nobreak >nul

REM 
start "" "http://localhost:8000/"

pause

@echo off
title Fast File Creator
echo Starting Fast File Creator...

:: Check if node_modules exists, if not, install dependencies
if not exist "node_modules\" (
    echo First time setup: Installing dependencies...
    echo This might take a minute or two.
    call npm install
)

:: Start the Vite development server and open the browser
echo.
echo Starting development server...
echo The app will open in your default browser shortly.
call npm run dev -- --open

pause

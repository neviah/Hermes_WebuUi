@echo off
REM Start Hermes WebUI from the Pinokio installation
setlocal enabledelayedexpansion

REM Get the port from first argument or use default
set PORT=%1
if "!PORT!"=="" set PORT=8787

REM Set environment variables
set HERMES_WEBUI_AGENT_DIR=D:\pinokio\api\Hermes_WebuUi.git\app\hermes-agent
set HERMES_WEBUI_PYTHON=D:\pinokio\api\Hermes_WebuUi.git\app\env\Scripts\python.exe
set HERMES_WEBUI_PORT=!PORT!
set HERMES_WEBUI_HOST=127.0.0.1
set HERMES_HOME=D:\pinokio\api\Hermes_WebuUi.git\app\.hermes
set HERMES_CONFIG_PATH=D:\pinokio\api\Hermes_WebuUi.git\app\.hermes\config.yaml
set TOKENIZERS_PARALLELISM=false

REM Change to the hermes-webui directory
cd /d D:\pinokio\api\Hermes_WebuUi.git\app\hermes-webui

echo.
echo Hermes WebUI starting on http://127.0.0.1:!PORT!
echo Agent dir: !HERMES_WEBUI_AGENT_DIR!
echo.

REM Run the server
!HERMES_WEBUI_PYTHON! server.py

pause

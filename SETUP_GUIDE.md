# Hermes WebUI + Pinokio Setup Guide

## ✅ What's Ready

Your Hermes WebUI is now running at **http://127.0.0.1:8787**

### Components Configured:
- **WebUI Dashboard**: Running successfully
- **Hermes Agent**: Connected and operational  
- **OpenRouter**: Already configured as an AI provider
- **Cron Jobs**: Ready to create

---

## 📋 Setting Up Your Reddit Cron Job

### Step 1: Navigate to Tasks Panel
1. Click the **Tasks** button in the left sidebar (calendar icon)

### Step 2: Create New Job
1. Click **+ New job**
2. Fill in the form with these values:

| Field | Value |
|-------|-------|
| **Job name** | `Daily Reddit Top Post` (or whatever you prefer) |
| **Schedule** | `0 16 * * 1` (Monday at 4:00 PM) |
| **Prompt** | `Visit reddit.com and tell me about the top post in r/all right now. Summarize the title, score, and why it's trending.` |
| **Delivery** | Choose: `Local` (save output), `Discord`, `Telegram`, or `Slack` |
| **Skills** (optional) | Leave blank or add custom skills if needed |

### Step 3: Create the Job
1. Click **Create job**
2. The job will appear in your task list and run automatically at 4 PM every Monday

---

## 🔧 Cron Expression Examples

Remember your corrected format from before:

| Time | Expression |
|------|-----------|
| **Every Monday at 4 PM** | `0 16 * * 1` |
| **Every day at 9 AM** | `0 9 * * *` |
| **Every hour** | `0 * * * *` |
| **Every 6 hours** | `0 */6 * * *` |
| **Every 15 minutes** | `*/15 * * * *` |

Or use simple syntax:
- `every 1h` = every hour
- `every 30m` = every 30 minutes  
- `every 2d` = every 2 days

---

## 🚀 Launching the WebUI (Future Sessions)

### Option 1: Using the Batch Script (Recommended for Windows)
```bash
D:\Projects\Hermes+WebUI\start-webui.bat
```

### Option 2: From PowerShell
```powershell
cd D:\pinokio\api\Hermes_WebuUi.git\app\hermes-webui
$env:HERMES_WEBUI_AGENT_DIR='D:\pinokio\api\Hermes_WebuUi.git\app\hermes-agent'
$env:HERMES_WEBUI_PORT='8787'
$env:HERMES_HOME='D:\pinokio\api\Hermes_WebuUi.git\app\.hermes'
& 'D:\pinokio\api\Hermes_WebuUi.git\app\env\Scripts\python.exe' server.py
```

### Option 3: Via Pinokio
- Open Pinokio and launch the **Hermes WebUI** app directly

---

## 🔑 Adding More Providers (If Needed)

1. Click the **Hermes WebUI** button (bottom left) to open **Control Center**
2. Go to **Providers** tab
3. Add API keys for:
   - **OpenAI** - Already working (gpt-5.4-mini is default)
   - **Anthropic** - For Claude models
   - **Google Gemini** - For Gemini models
   - Or keep using **OpenRouter** for all providers

---

## 📁 Project Structure

```
D:\Projects\Hermes+WebUI/
├── start-webui.bat              # Quick start script for Windows
├── app/
│   └── .env                     # Environment variables (configured)
│
D:\pinokio\api\Hermes_WebuUi.git/
├── app/
│   ├── hermes-agent/           # Hermes Agent installation
│   ├── hermes-webui/           # WebUI source code
│   ├── env/                    # Python virtual environment (shared)
│   └── .hermes/                # Hermes config and state
```

---

## 🎯 Next Steps

1. ✅ **Test the WebUI** - It's running now at http://127.0.0.1:8787
2. ✅ **Set up your first cron job** - Follow the Reddit job example above
3. ✅ **Configure notifications** - Set delivery to Discord/Telegram if you want
4. **Commit to git** (Your preference) - Save these setup files:
   ```bash
   git add start-webui.bat app/.env
   git commit -m "feat: hermes-webui setup with pinokio integration"
   git push
   ```

---

## 🐛 Troubleshooting

**Port 8787 already in use?**
```bash
# Kill existing process
netstat -ano | findstr :8787
taskkill /PID <PID> /F

# Or use a different port
start-webui.bat 8788
```

**Agent not detected?**
- Check `HERMES_WEBUI_AGENT_DIR` points to correct location
- Verify `D:\pinokio\api\Hermes_WebuUi.git\app\hermes-agent\run_agent.py` exists

**Cron jobs not running?**
- Ensure the WebUI server stays running (don't close the terminal)
- Check the Tasks panel for error messages

---

**Everything is now connected and ready to go!** 🚀

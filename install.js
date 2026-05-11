module.exports = {
  run: [
    // Clone both upstream repos (upstream-friendly: never patched)
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/NousResearch/hermes-agent app/hermes-agent",
          "git clone https://github.com/nesquena/hermes-webui app/hermes-webui",
          "node patch_hermes_webui_local_routing.js"
        ]
      }
    },

    // Install Hermes agent's Node-side browser tooling and local Chromium.
    // The browser_* tools rely on the agent-browser CLI from package.json,
    // which is separate from the Python dependencies above.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent",
        message: [
          "npm install",
          "npx agent-browser install"
        ]
      }
    },

    // Build Hermes Agent native dashboard frontend once at install-time.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent/web",
        message: [
          "npm install",
          "node -e \"const fs=require('fs');const cp=(a,b)=>fs.cpSync(a,b,{recursive:true});const rm=(d)=>{if(fs.existsSync(d))fs.rmSync(d,{recursive:true,force:true})};rm('public/fonts');rm('public/ds-assets');cp('node_modules/@nous-research/ui/dist/fonts','public/fonts');cp('node_modules/@nous-research/ui/dist/assets','public/ds-assets');\"",
          "npx vite build"
        ]
      }
    },

    // Build a shared Python 3.11 venv and install both projects into it.
    // hermes-agent is installed in editable mode so `git pull` in update.js
    // picks up changes without a reinstall step.
    {
      method: "shell.run",
      params: {
        venv: "env",
        venv_python: "3.11",
        path: "app",
        message: [
          "uv pip install -e \"./hermes-agent[cron,pty,mcp]\"",
          "uv pip install fastapi \"uvicorn[standard]\"",
          "uv pip install -r ./hermes-webui/requirements.txt"
        ]
      }
    }
  ]
}

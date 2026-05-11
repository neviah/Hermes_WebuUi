// Bootstrap: pull latest launcher code, then update both upstream repos
// and refresh the venv so new dependencies are picked up automatically.
module.exports = {
  run: [
    // Update this launcher repo
    {
      method: "shell.run",
      params: {
        message: "git pull"
      }
    },

    // Update hermes-agent (editable install: no reinstall needed for code changes,
    // but we reinstall anyway in case the dependency set changed)
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent",
        message: [
          // Prior runs may touch lockfiles; restore them so git pull can proceed.
          "git restore package-lock.json web/package-lock.json",
          "git pull"
        ]
      }
    },

    // Update hermes-webui
    {
      method: "shell.run",
      params: {
        path: "app/hermes-webui",
        message: "git pull"
      }
    },

    // Re-apply local routing compatibility patch after upstream updates.
    // This is idempotent and only changes one guarded block when needed.
    {
      method: "shell.run",
      params: {
        message: "node patch_hermes_webui_local_routing.js"
      }
    },

    // Refresh Hermes agent's Node/browser dependencies too. The browser tools
    // depend on the local agent-browser CLI and its managed Chromium install.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent",
        message: [
          "npm ci",
          "npx agent-browser install"
        ]
      }
    },

    // Refresh Hermes Agent native dashboard frontend after updates.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent/web",
        message: [
          "npm ci",
          "node -e \"const fs=require('fs');const cp=(a,b)=>fs.cpSync(a,b,{recursive:true});const rm=(d)=>{if(fs.existsSync(d))fs.rmSync(d,{recursive:true,force:true})};rm('public/fonts');rm('public/ds-assets');cp('node_modules/@nous-research/ui/dist/fonts','public/fonts');cp('node_modules/@nous-research/ui/dist/assets','public/ds-assets');\"",
          "npx vite build"
        ]
      }
    },

    // Refresh dependencies in case requirements changed upstream
    {
      method: "shell.run",
      params: {
        venv: "env",
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

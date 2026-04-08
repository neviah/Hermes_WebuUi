const browserBinPathCommand = process.platform === "win32"
  ? 'set "PATH=%CD%\\hermes-agent\\node_modules\\.bin;%PATH%"'
  : 'export PATH="$(pwd)/hermes-agent/node_modules/.bin:$PATH"'

module.exports = {
  daemon: true,
  run: [
    // Grab the next available port and stash it so it stays consistent
    // across steps ({{port}} re-evaluates every use).
    {
      method: "local.set",
      params: {
        port: "{{port}}"
      }
    },

    // Start the Hermes Web UI server.
    // config.py auto-discovers the agent via sibling directory resolution:
    //   REPO_ROOT = <this_repo>/api/../  =>  app/hermes-webui
    //   sibling   →  app/hermes-agent   (our clone)
    // No HERMES_WEBUI_AGENT_DIR override needed.
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        env: {
          HERMES_WEBUI_PORT: "{{local.port}}",
          HERMES_WEBUI_HOST: "127.0.0.1",
          TOKENIZERS_PARALLELISM: "false"
        },
        message: [
          browserBinPathCommand + " && python hermes-webui/server.py"
        ],
        on: [{
          event: "/(http:\\/\\/[0-9.:]+)/",
          done: true
        }]
      }
    },

    // Expose the URL so pinokio.js can surface the "Open WebUI" button.
    {
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}

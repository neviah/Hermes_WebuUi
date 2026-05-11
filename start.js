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

    // Start the Hermes Web UI server (modern web interface)
    // instead of the legacy CLI dashboard.
    {
      method: "shell.run",
      params: {
        venv: "app/env",
        path: "app",
        env: {
          HERMES_WEBUI_AGENT_DIR: "hermes-agent",
          HERMES_WEBUI_PORT: "{{local.port}}",
          HERMES_WEBUI_HOST: "127.0.0.1",
          TOKENIZERS_PARALLELISM: "false"
        },
        message: "python hermes-webui/server.py",
        on: [{
          event: "/(http:\\/\\/[0-9.:]+)/",
          done: true
        }]
      }
    },

    // Expose the URL so pinokio.js can surface the dashboard button.
    {
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}

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

    // Start the legacy hermes-webui server.
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
        message: "python hermes-webui/server.py",
        on: [{
          event: "/(http:\\/\\/[0-9.:]+)/",
          done: true
        }]
      }
    },

    {
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}

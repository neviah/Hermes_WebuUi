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

    // Start the legacy Hermes Agent CLI dashboard (hermes_cli.main dashboard)
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent",
        venv: "app/env",
        env: {
          HERMES_WEB_DIST: "hermes_cli/web_dist",
          TOKENIZERS_PARALLELISM: "false"
        },
        message: "python -m hermes_cli.main dashboard --host 127.0.0.1 --port {{local.port}} --no-open",
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

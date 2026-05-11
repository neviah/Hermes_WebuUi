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

    // Start the modern Hermes Web UI server from github.com/nesquena/hermes-webui
    // This is the new three-panel interface with cron jobs, skills, memory, etc.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-webui",
        env: {
          HERMES_WEBUI_AGENT_DIR: "../hermes-agent",
          HERMES_WEBUI_PORT: "{{local.port}}",
          HERMES_WEBUI_HOST: "127.0.0.1",
          TOKENIZERS_PARALLELISM: "false",
          PYTHONPATH: "../hermes-agent:."
        },
        message: "..\\env\\Scripts\\python.exe server.py",
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

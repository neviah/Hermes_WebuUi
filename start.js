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

    // Start Hermes Agent's native dashboard.
    // We point HERMES_WEB_DIST at the prebuilt web/dist output so startup
    // does not run npm install/build on every launch.
    {
      method: "shell.run",
      params: {
        path: "app/hermes-agent",
        env: {
          HERMES_WEB_DIST: "hermes_cli/web_dist",
          TOKENIZERS_PARALLELISM: "false"
        },
        // Use the shared app/env explicitly so we don't create a second env
        // under app/hermes-agent/env (which misses required Python deps).
        message: "..\\env\\Scripts\\python.exe -m hermes_cli.main dashboard --host 127.0.0.1 --port {{local.port}} --no-open",
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

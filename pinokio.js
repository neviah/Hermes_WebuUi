module.exports = {
  version: "5.0",
  title: "Hermes + WebUI",
  description: "Hermes Agent with modern WebUI (nesquena/hermes-webui). Persistent memory, multi-provider AI (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter), scheduled cron jobs, skills, and sessions. Three-panel interface with chat, tasks, memory, and workspace browser. https://github.com/nesquena/hermes-webui",
  icon: "icon.png",
  menu: async (kernel, info) => {
    let installed = info.exists("app/env")
    let running = {
      install: info.running("install.js"),
      start:   info.running("start.js"),
      update:  info.running("update.js"),
      reset:   info.running("reset.js"),
      setup:   info.running("configure.js"),
    }

    if (running.install) {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Installing",
        href: "install.js",
      }]
    }

    if (!installed) {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Install",
        href: "install.js",
      }]
    }

    // Installed — handle each running state
    if (running.start) {
      let local = info.local("start.js")
      if (local && local.url) {
        return [{
          default: true,
          popout: true,
          icon: "fa-solid fa-message",
          text: "Open WebUI",
          href: local.url,
        }, {
          icon: "fa-solid fa-terminal",
          text: "Terminal",
          href: "start.js",
        }]
      }
      return [{
        default: true,
        icon: "fa-solid fa-terminal",
        text: "Terminal",
        href: "start.js",
      }]
    }

    if (running.update) {
      return [{
        default: true,
        icon: "fa-solid fa-arrows-rotate",
        text: "Updating",
        href: "update.js",
      }]
    }

    if (running.reset) {
      return [{
        default: true,
        icon: "fa-solid fa-broom",
        text: "Resetting",
        href: "reset.js",
      }]
    }

    if (running.setup) {
      return [{
        default: true,
        icon: "fa-solid fa-key",
        text: "Setup",
        href: "configure.js",
      }]
    }

    // Idle — show full action menu
    return [{
      default: true,
      icon: "fa-solid fa-power-off",
      text: "Start (Modern WebUI)",
      href: "start.js",
    }, {
      icon: "fa-solid fa-window-restore",
      text: "Start (Legacy CLI Dashboard)",
      href: "start_legacy_webui.js",
    }, {
      icon: "fa-solid fa-key",
      text: "Setup",
      href: "configure.js",
    }, {
      icon: "fa-solid fa-arrows-rotate",
      text: "Update",
      href: "update.js",
    }, {
      icon: "fa-solid fa-plug",
      text: "Install",
      href: "install.js",
    }, {
      icon: "fa-regular fa-circle-xmark",
      text: "Reset",
      href: "reset.js",
      confirm: "Are you sure? This removes the cloned repos and venv. Your Hermes memory at ~/.hermes is untouched.",
    }]
  }
}

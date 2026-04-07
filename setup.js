const os   = require('os')
const path = require('path')
const fs   = require('fs')

function parseEnv(content) {
  const result = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) result[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return result
}

module.exports = {
  run: [

    // Step 1 — Read any existing ~/.hermes/.env into local variables so we
    //           can pre-fill the form with whatever the user already has.
    {
      method: async (req, ondata, kernel) => {
        const envPath = path.join(os.homedir(), '.hermes', '.env')
        let existing = {}
        try {
          const content = await fs.promises.readFile(envPath, 'utf8')
          existing = parseEnv(content)
        } catch (e) { /* file doesn't exist yet — that's fine */ }
        return existing
      }
    },

    // Step 2 — Stash the parsed values so the form can reference them via
    //           {{local.existing.*}} template expressions.
    {
      method: "local.set",
      params: {
        existing: "{{input}}"
      }
    },

    // Step 3 — Show the configuration form.
    //           Password fields mask the value; existing keys pre-fill as ••••.
    //           Leave any field blank to keep its existing value unchanged.
    {
      method: "input",
      params: {
        title: "Hermes Setup — API Keys",
        description: "Enter the keys for the AI providers you want to use. Leave a field blank to keep its current value. Changes are saved to ~/.hermes/.env and take effect on the next start.",
        form: [
          {
            key: "OPENAI_API_KEY",
            type: "password",
            title: "OpenAI API Key",
            description: "For GPT-4o, o3, etc. — https://platform.openai.com/api-keys",
            placeholder: "sk-...",
            default: "{{local.existing.OPENAI_API_KEY || ''}}"
          },
          {
            key: "ANTHROPIC_API_KEY",
            type: "password",
            title: "Anthropic API Key",
            description: "For Claude models — https://console.anthropic.com/",
            placeholder: "sk-ant-...",
            default: "{{local.existing.ANTHROPIC_API_KEY || ''}}"
          },
          {
            key: "OPENROUTER_API_KEY",
            type: "password",
            title: "OpenRouter API Key",
            description: "Access 200+ models from one key — https://openrouter.ai/keys",
            placeholder: "sk-or-...",
            default: "{{local.existing.OPENROUTER_API_KEY || ''}}"
          },
          {
            key: "GEMINI_API_KEY",
            type: "password",
            title: "Google Gemini API Key",
            description: "For Gemini models — https://aistudio.google.com/apikey",
            placeholder: "AIza...",
            default: "{{local.existing.GEMINI_API_KEY || ''}}"
          }
        ]
      }
    },

    // Step 4 — Merge submitted values with the existing file, preserving
    //           any keys we didn't show in the form, then write the file.
    {
      method: async (req, ondata, kernel) => {
        const hermesDir = path.join(os.homedir(), '.hermes')
        const envPath   = path.join(hermesDir, '.env')

        // Ensure ~/.hermes/ exists
        await fs.promises.mkdir(hermesDir, { recursive: true })

        // Read existing .env so we don't clobber keys we didn't show
        let existing = {}
        try {
          const content = await fs.promises.readFile(envPath, 'utf8')
          existing = parseEnv(content)
        } catch (e) {}

        // Only overwrite fields that were actually filled in
        for (const [k, v] of Object.entries(req.input)) {
          if (v && v.trim()) {
            existing[k] = v.trim()
          }
        }

        const content = Object.entries(existing)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n') + '\n'

        await fs.promises.writeFile(envPath, content, 'utf8')
        ondata({ raw: `\r\n✓ Saved to ${envPath}\r\n` })
      }
    },

    // Step 5 — Show a success notification.
    {
      method: "notify",
      params: {
        html: "API keys saved to ~/.hermes/.env — restart Hermes for them to take effect."
      }
    }

  ]
}

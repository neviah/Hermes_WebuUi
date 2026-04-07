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

        // Save one or more API key env vars to ~/.hermes/.env (merges, never wipes)
        async function saveToEnv(kvs, ondata) {
          const hermesDir = path.join(os.homedir(), '.hermes')
          const envPath   = path.join(hermesDir, '.env')
          await fs.promises.mkdir(hermesDir, { recursive: true })
          let existing = {}
          try { existing = parseEnv(await fs.promises.readFile(envPath, 'utf8')) } catch (_) {}
          for (const [k, v] of Object.entries(kvs)) {
            if (k !== 'model' && v && typeof v === 'string' && v.trim()) {
              existing[k] = v.trim()
            }
          }
          const content = Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
          await fs.promises.writeFile(envPath, content, 'utf8')
          ondata({ raw: `\r\n✓ API key saved to ${envPath}\r\n` })
        }

        // Persist the chosen default model into ~/.hermes/webui/settings.json
        // (hermes-webui reads this file on startup — no env var needed)
        async function saveModel(modelId, ondata) {
          if (!modelId || !modelId.trim()) return
          const settingsDir  = path.join(os.homedir(), '.hermes', 'webui')
          const settingsPath = path.join(settingsDir, 'settings.json')
          let settings = {}
          try { settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8')) } catch (_) {}
          settings.default_model = modelId.trim()
          await fs.promises.mkdir(settingsDir, { recursive: true })
          await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
          ondata({ raw: `✓ Default model set to "${modelId.trim()}"\r\n` })
        }

        module.exports = {
          run: [

            // ── 1. Read existing keys + current model ────────────────────────────
            {
              method: async (req, ondata, kernel) => {
                let existing = {}
                try { existing = parseEnv(await fs.promises.readFile(path.join(os.homedir(), '.hermes', '.env'), 'utf8')) } catch (_) {}
                try {
                  const s = JSON.parse(await fs.promises.readFile(path.join(os.homedir(), '.hermes', 'webui', 'settings.json'), 'utf8'))
                  if (s.default_model) existing._current_model = s.default_model
                } catch (_) {}
                return existing
              }
            },

            // ── 2. Stash as local.existing ──────────────────────────────────────
            { method: "local.set", params: { existing: "{{input}}" } },

            // ── 3. Choose provider ───────────────────────────────────────────────
            {
              method: "input",
              params: {
                title: "Hermes Setup — Choose Provider",
                description: "Select which AI provider to configure. Run Setup again to add more providers.",
                form: [{
                  type: "select",
                  key: "provider",
                  title: "AI Provider",
                  items: [
                    { text: "OpenAI  (GPT-5.4-mini, GPT-4o, o3, o4-mini...)",         value: "openai"      },
                    { text: "Anthropic  (Claude Opus, Sonnet, Haiku...)",               value: "anthropic"   },
                    { text: "OpenRouter  (200+ models with one key)",                   value: "openrouter"  },
                    { text: "Google  (Gemini 2.5 Pro, 2.0 Flash...)",                  value: "google"      },
                    { text: "DeepSeek  (DeepSeek V3, Reasoner...)",                    value: "deepseek"    },
                  ]
                }]
              }
            },

            // ── 4. Store provider choice ─────────────────────────────────────────
            { method: "local.set", params: { provider: "{{input.provider}}" } },

            // ════════════════════════════════════════════════════════════════════
            // OpenAI
            // ════════════════════════════════════════════════════════════════════
            {
              when: "{{local.provider === 'openai'}}",
              method: "input",
              params: {
                title: "OpenAI — API Key & Model",
                description: "Get your key at https://platform.openai.com/api-keys",
                form: [
                  {
                    key: "OPENAI_API_KEY", type: "password",
                    title: "OpenAI API Key",
                    placeholder: "sk-...",
                    default: "{{local.existing.OPENAI_API_KEY || ''}}"
                  },
                  {
                    key: "model",
                    title: "Default Model  (leave blank to keep '{{local.existing._current_model || 'gpt-5.4-mini'}}')",
                    description: "Options: gpt-5.4-mini  gpt-4o  o3  o4-mini  gpt-5.4",
                    placeholder: "gpt-5.4-mini"
                  }
                ]
              }
            },
            {
              when: "{{local.provider === 'openai'}}",
              method: async (req, ondata, kernel) => {
                await saveToEnv(req.input, ondata)
                await saveModel(req.input.model, ondata)
              }
            },

            // ════════════════════════════════════════════════════════════════════
            // Anthropic
            // ════════════════════════════════════════════════════════════════════
            {
              when: "{{local.provider === 'anthropic'}}",
              method: "input",
              params: {
                title: "Anthropic — API Key & Model",
                description: "Get your key at https://console.anthropic.com/",
                form: [
                  {
                    key: "ANTHROPIC_API_KEY", type: "password",
                    title: "Anthropic API Key",
                    placeholder: "sk-ant-...",
                    default: "{{local.existing.ANTHROPIC_API_KEY || ''}}"
                  },
                  {
                    key: "model",
                    title: "Default Model  (leave blank to keep '{{local.existing._current_model || 'claude-sonnet-4.6'}}')",
                    description: "Options: claude-opus-4.6  claude-sonnet-4.6  claude-sonnet-4-5  claude-haiku-4-5",
                    placeholder: "claude-sonnet-4.6"
                  }
                ]
              }
            },
            {
              when: "{{local.provider === 'anthropic'}}",
              method: async (req, ondata, kernel) => {
                await saveToEnv(req.input, ondata)
                await saveModel(req.input.model, ondata)
              }
            },

            // ════════════════════════════════════════════════════════════════════
            // OpenRouter
            // ════════════════════════════════════════════════════════════════════
            {
              when: "{{local.provider === 'openrouter'}}",
              method: "input",
              params: {
                title: "OpenRouter — API Key & Model",
                description: "Get your key at https://openrouter.ai/keys  •  Browse all models at https://openrouter.ai/models",
                form: [
                  {
                    key: "OPENROUTER_API_KEY", type: "password",
                    title: "OpenRouter API Key",
                    placeholder: "sk-or-...",
                    default: "{{local.existing.OPENROUTER_API_KEY || ''}}"
                  },
                  {
                    key: "model",
                    title: "Default Model  (leave blank to keep '{{local.existing._current_model || 'not set'}}')",
                    description: "Use provider/model-name format from openrouter.ai/models — e.g.  anthropic/claude-sonnet-4.6  openai/gpt-4o  google/gemini-2.5-pro  meta-llama/llama-4-maverick",
                    placeholder: "anthropic/claude-sonnet-4.6"
                  }
                ]
              }
            },
            {
              when: "{{local.provider === 'openrouter'}}",
              method: async (req, ondata, kernel) => {
                await saveToEnv(req.input, ondata)
                await saveModel(req.input.model, ondata)
              }
            },

            // ════════════════════════════════════════════════════════════════════
            // Google Gemini
            // ════════════════════════════════════════════════════════════════════
            {
              when: "{{local.provider === 'google'}}",
              method: "input",
              params: {
                title: "Google Gemini — API Key & Model",
                description: "Get your key at https://aistudio.google.com/apikey",
                form: [
                  {
                    key: "GEMINI_API_KEY", type: "password",
                    title: "Google Gemini API Key",
                    placeholder: "AIza...",
                    default: "{{local.existing.GEMINI_API_KEY || ''}}"
                  },
                  {
                    key: "model",
                    title: "Default Model  (leave blank to keep '{{local.existing._current_model || 'gemini-2.5-pro'}}')",
                    description: "Options: gemini-2.5-pro  gemini-2.5-flash  gemini-2.0-flash",
                    placeholder: "gemini-2.5-pro"
                  }
                ]
              }
            },
            {
              when: "{{local.provider === 'google'}}",
              method: async (req, ondata, kernel) => {
                await saveToEnv(req.input, ondata)
                await saveModel(req.input.model, ondata)
              }
            },

            // ════════════════════════════════════════════════════════════════════
            // DeepSeek
            // ════════════════════════════════════════════════════════════════════
            {
              when: "{{local.provider === 'deepseek'}}",
              method: "input",
              params: {
                title: "DeepSeek — API Key & Model",
                description: "Get your key at https://platform.deepseek.com/",
                form: [
                  {
                    key: "DEEPSEEK_API_KEY", type: "password",
                    title: "DeepSeek API Key",
                    default: "{{local.existing.DEEPSEEK_API_KEY || ''}}"
                  },
                  {
                    key: "model",
                    title: "Default Model  (leave blank to keep '{{local.existing._current_model || 'deepseek-chat-v3-0324'}}')",
                    description: "Options: deepseek-chat-v3-0324  deepseek-reasoner",
                    placeholder: "deepseek-chat-v3-0324"
                  }
                ]
              }
            },
            {
              when: "{{local.provider === 'deepseek'}}",
              method: async (req, ondata, kernel) => {
                await saveToEnv(req.input, ondata)
                await saveModel(req.input.model, ondata)
              }
            },

            // ── Done ─────────────────────────────────────────────────────────────
            {
              method: "notify",
              params: {
                html: "Setup complete — restart Hermes for changes to take effect."
              }
            }

          ]
        }

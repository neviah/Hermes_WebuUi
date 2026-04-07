const os = require('os')
const path = require('path')
const fs = require('fs')

function parseEnv(content) {
  const result = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) result[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return result
}

async function saveToEnv(kvs, ondata) {
  const hermesDir = path.join(os.homedir(), '.hermes')
  const envPath = path.join(hermesDir, '.env')

  await fs.promises.mkdir(hermesDir, { recursive: true })

  let existing = {}
  try {
    existing = parseEnv(await fs.promises.readFile(envPath, 'utf8'))
  } catch (_) {}

  for (const [k, v] of Object.entries(kvs || {})) {
    if (k !== 'model' && typeof v === 'string' && v.trim()) {
      existing[k] = v.trim()
    }
  }

  const content = Object.entries(existing)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n'

  await fs.promises.writeFile(envPath, content, 'utf8')
  ondata({ raw: `\r\nSaved API key data to ${envPath}\r\n` })
}

async function saveModel(modelId, ondata) {
  if (!modelId || !modelId.trim()) return

  const settingsDir = path.join(os.homedir(), '.hermes', 'webui')
  const settingsPath = path.join(settingsDir, 'settings.json')

  let settings = {}
  try {
    settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'))
  } catch (_) {}

  settings.default_model = modelId.trim()

  await fs.promises.mkdir(settingsDir, { recursive: true })
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
  ondata({ raw: `Set default model to ${modelId.trim()}\r\n` })
}

module.exports = {
  run: [
    {
      method: async () => {
        const existing = {}

        try {
          const env = await fs.promises.readFile(path.join(os.homedir(), '.hermes', '.env'), 'utf8')
          Object.assign(existing, parseEnv(env))
        } catch (_) {}

        try {
          const settings = JSON.parse(
            await fs.promises.readFile(path.join(os.homedir(), '.hermes', 'webui', 'settings.json'), 'utf8')
          )
          if (settings.default_model) existing._current_model = settings.default_model
        } catch (_) {}

        return existing
      }
    },
    {
      method: 'local.set',
      params: {
        existing: '{{input}}'
      }
    },
    {
      method: 'input',
      params: {
        title: 'Hermes Setup - Choose Provider',
        description: 'Select one provider to configure. Run Setup again for additional providers.',
        form: [
          {
            key: 'provider',
            type: 'select',
            title: 'AI Provider',
            items: [
              { text: 'OpenAI', value: 'openai' },
              { text: 'Anthropic', value: 'anthropic' },
              { text: 'OpenRouter', value: 'openrouter' },
              { text: 'Google Gemini', value: 'google' },
              { text: 'DeepSeek', value: 'deepseek' }
            ]
          }
        ]
      }
    },
    {
      method: 'local.set',
      params: {
        provider: '{{input.provider}}'
      }
    },

    {
      when: "{{local.provider === 'openai'}}",
      method: 'input',
      params: {
        title: 'OpenAI - API Key and Model',
        form: [
          {
            key: 'OPENAI_API_KEY',
            type: 'password',
            title: 'OpenAI API Key',
            placeholder: 'sk-...',
            default: "{{local.existing.OPENAI_API_KEY || ''}}"
          },
          {
            key: 'model',
            type: 'text',
            title: "Default Model (optional, current: {{local.existing._current_model || 'openai/gpt-5.4-mini'}})",
            placeholder: 'openai/gpt-5.4-mini'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'openai'}}",
      method: async (req, ondata) => {
        await saveToEnv(req.input, ondata)
        await saveModel(req.input.model, ondata)
      }
    },

    {
      when: "{{local.provider === 'anthropic'}}",
      method: 'input',
      params: {
        title: 'Anthropic - API Key and Model',
        form: [
          {
            key: 'ANTHROPIC_API_KEY',
            type: 'password',
            title: 'Anthropic API Key',
            placeholder: 'sk-ant-...',
            default: "{{local.existing.ANTHROPIC_API_KEY || ''}}"
          },
          {
            key: 'model',
            type: 'text',
            title: "Default Model (optional, current: {{local.existing._current_model || 'anthropic/claude-sonnet-4.6'}})",
            placeholder: 'anthropic/claude-sonnet-4.6'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'anthropic'}}",
      method: async (req, ondata) => {
        await saveToEnv(req.input, ondata)
        await saveModel(req.input.model, ondata)
      }
    },

    {
      when: "{{local.provider === 'openrouter'}}",
      method: 'input',
      params: {
        title: 'OpenRouter - API Key and Model',
        description: 'Use model IDs like anthropic/claude-sonnet-4.6 from openrouter.ai/models',
        form: [
          {
            key: 'OPENROUTER_API_KEY',
            type: 'password',
            title: 'OpenRouter API Key',
            placeholder: 'sk-or-...',
            default: "{{local.existing.OPENROUTER_API_KEY || ''}}"
          },
          {
            key: 'model',
            type: 'text',
            title: "Default Model (optional, current: {{local.existing._current_model || 'openai/gpt-5.4-mini'}})",
            placeholder: 'anthropic/claude-sonnet-4.6'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'openrouter'}}",
      method: async (req, ondata) => {
        await saveToEnv(req.input, ondata)
        await saveModel(req.input.model, ondata)
      }
    },

    {
      when: "{{local.provider === 'google'}}",
      method: 'input',
      params: {
        title: 'Google Gemini - API Key and Model',
        form: [
          {
            key: 'GEMINI_API_KEY',
            type: 'password',
            title: 'Gemini API Key',
            placeholder: 'AIza...',
            default: "{{local.existing.GEMINI_API_KEY || ''}}"
          },
          {
            key: 'model',
            type: 'text',
            title: "Default Model (optional, current: {{local.existing._current_model || 'google/gemini-2.5-pro'}})",
            placeholder: 'google/gemini-2.5-pro'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'google'}}",
      method: async (req, ondata) => {
        await saveToEnv(req.input, ondata)
        await saveModel(req.input.model, ondata)
      }
    },

    {
      when: "{{local.provider === 'deepseek'}}",
      method: 'input',
      params: {
        title: 'DeepSeek - API Key and Model',
        form: [
          {
            key: 'DEEPSEEK_API_KEY',
            type: 'password',
            title: 'DeepSeek API Key',
            default: "{{local.existing.DEEPSEEK_API_KEY || ''}}"
          },
          {
            key: 'model',
            type: 'text',
            title: "Default Model (optional, current: {{local.existing._current_model || 'deepseek/deepseek-chat'}})",
            placeholder: 'deepseek/deepseek-chat'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'deepseek'}}",
      method: async (req, ondata) => {
        await saveToEnv(req.input, ondata)
        await saveModel(req.input.model, ondata)
      }
    },

    {
      method: 'notify',
      params: {
        html: 'Setup complete. Restart Hermes for changes to take effect.'
      }
    }
  ]
}

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

function parseSimpleYaml(text) {
  const result = {}
  let currentObj = null
  let currentList = null

  function parseScalar(raw) {
    const val = (raw || '').trim()
    if (!val) return ''
    const unquoted = val.replace(/^["']|["']$/g, '')
    if (/^-?\d+$/.test(unquoted)) {
      const n = Number(unquoted)
      if (Number.isFinite(n)) return n
    }
    return unquoted
  }

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!line.startsWith(' ')) {
      const m = line.match(/^([\w-]+)\s*:\s*(.*)$/)
      if (m) {
        const val = parseScalar(m[2])
        if (val) {
          result[m[1]] = val
          currentObj = null
          currentList = null
        } else {
          result[m[1]] = {}
          currentObj = result[m[1]]
          currentList = null
        }
      }
    } else if (currentObj !== null) {
      const listItem = line.match(/^\s{4}-\s*(.+)$/)
      if (listItem && Array.isArray(currentList)) {
        currentList.push(listItem[1].replace(/^["']|["']$/g, '').trim())
        continue
      }

      const m = line.match(/^\s{2}([\w-]+)\s*:\s*(.*)$/)
      if (m) {
        const nestedVal = parseScalar(m[2])
        if (nestedVal) {
          currentObj[m[1]] = nestedVal
          currentList = null
        } else {
          currentObj[m[1]] = []
          currentList = currentObj[m[1]]
        }
      }
    }
  }
  return result
}

function serializeSimpleYaml(obj) {
  const lines = []

  function appendScalarLine(prefix, value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      lines.push(`${prefix}: ${value}`)
      return
    }
    if (typeof value === 'string' && value) {
      lines.push(`${prefix}: "${value}"`)
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null) {
      lines.push(`${k}:`)
      for (const [nk, nv] of Object.entries(v)) {
        if (typeof nv === 'string' || typeof nv === 'number') {
          appendScalarLine(`  ${nk}`, nv)
        } else if (Array.isArray(nv) && nv.length > 0) {
          lines.push(`  ${nk}:`)
          for (const item of nv) {
            if (typeof item === 'string' && item.trim()) {
              lines.push(`    - ${item.trim()}`)
            }
          }
        }
      }
    } else if (typeof v === 'string' || typeof v === 'number') {
      appendScalarLine(k, v)
    }
  }
  return lines.join('\n') + '\n'
}

function parsePositiveInt(raw, fallback) {
  const n = Number(String(raw || '').trim())
  return Number.isInteger(n) && n > 0 ? n : fallback
}

async function saveToConfigYaml(update, ondata) {
  const hermesDir = path.join(os.homedir(), '.hermes')
  const yamlPath = path.join(hermesDir, 'config.yaml')
  await fs.promises.mkdir(hermesDir, { recursive: true })

  let existing = {}
  try { existing = parseSimpleYaml(await fs.promises.readFile(yamlPath, 'utf8')) } catch (_) {}

  if (update && typeof update === 'object') {
    if (update.model && typeof update.model === 'object') {
      const prevModel = (typeof existing.model === 'object' && existing.model) ? existing.model : {}
      existing.model = { ...prevModel, ...update.model }
    }
    if (update.platform_toolsets && typeof update.platform_toolsets === 'object') {
      const prevToolsets = (typeof existing.platform_toolsets === 'object' && existing.platform_toolsets)
        ? existing.platform_toolsets
        : {}
      existing.platform_toolsets = { ...prevToolsets, ...update.platform_toolsets }
    }
  }

  await fs.promises.writeFile(yamlPath, serializeSimpleYaml(existing), 'utf8')
  ondata({ raw: `Saved local model config to ${yamlPath}\r\n` })
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

        try {
          const yamlText = await fs.promises.readFile(path.join(os.homedir(), '.hermes', 'config.yaml'), 'utf8')
          const cfg = parseSimpleYaml(yamlText)
          if (cfg.model && typeof cfg.model === 'object' && cfg.model.base_url) {
            existing._current_base_url = cfg.model.base_url
          }
          if (cfg.model && typeof cfg.model === 'object' && cfg.model.context_length) {
            existing._current_context_length = cfg.model.context_length
          }
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
              { text: 'DeepSeek', value: 'deepseek' },
              { text: 'LM Studio (local)', value: 'lmstudio' },
              { text: 'Ollama (local)', value: 'ollama' }
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
      when: "{{local.provider === 'lmstudio'}}",
      method: 'input',
      params: {
        title: 'LM Studio - Local Model Server',
        description: 'Hermes will auto-detect models from your running LM Studio server. Start LM Studio and load a model before chatting.',
        form: [
          {
            key: 'base_url',
            type: 'text',
            title: "LM Studio API URL (current: {{local.existing._current_base_url || 'not set'}})",
            placeholder: 'http://127.0.0.1:1234/v1',
            default: "{{local.existing._current_base_url || 'http://127.0.0.1:1234/v1'}}"
          },
          {
            key: 'context_length',
            type: 'text',
            title: "Context Length (current: {{local.existing._current_context_length || 'not set'}})",
            placeholder: '20350',
            default: "{{local.existing._current_context_length || '20350'}}"
          },
          {
            key: 'compact_mode',
            type: 'select',
            title: 'Enable Compact Local Mode (recommended for 4k context models)',
            items: [
              { text: 'Yes - reduce tool prompt size', value: 'yes' },
              { text: 'No - keep full toolset', value: 'no' }
            ],
            default: 'yes'
          },
          {
            key: 'model',
            type: 'text',
            title: 'Default Model ID (optional — leave blank to auto-detect from server)',
            placeholder: 'e.g. gemma-4-26b-it'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'lmstudio'}}",
      method: async (req, ondata) => {
        const baseUrl = (req.input.base_url || 'http://127.0.0.1:1234/v1').trim()
        const contextLength = parsePositiveInt(req.input.context_length, 20350)
        const update = {
          model: {
            base_url: baseUrl,
            context_length: contextLength
          }
        }
        const compactEnabled = (req.input.compact_mode || 'yes') === 'yes'
        if (compactEnabled) {
          await saveToConfigYaml({
            ...update,
            platform_toolsets: {
              cli: ['file', 'terminal', 'todo', 'clarify']
            }
          }, ondata)
          ondata({ raw: 'Enabled compact local toolset profile for lower context usage\r\n' })
        } else {
          await saveToConfigYaml(update, ondata)
        }
        if (req.input.model && req.input.model.trim()) {
          await saveModel(req.input.model, ondata)
        }
      }
    },

    {
      when: "{{local.provider === 'ollama'}}",
      method: 'input',
      params: {
        title: 'Ollama - Local Model Server',
        description: 'Hermes will auto-detect models from your running Ollama server.',
        form: [
          {
            key: 'base_url',
            type: 'text',
            title: "Ollama API URL (current: {{local.existing._current_base_url || 'not set'}})",
            placeholder: 'http://localhost:11434/v1',
            default: "{{local.existing._current_base_url || 'http://localhost:11434/v1'}}"
          },
          {
            key: 'context_length',
            type: 'text',
            title: "Context Length (current: {{local.existing._current_context_length || 'not set'}})",
            placeholder: '8192',
            default: "{{local.existing._current_context_length || '8192'}}"
          },
          {
            key: 'compact_mode',
            type: 'select',
            title: 'Enable Compact Local Mode (recommended for 4k context models)',
            items: [
              { text: 'Yes - reduce tool prompt size', value: 'yes' },
              { text: 'No - keep full toolset', value: 'no' }
            ],
            default: 'yes'
          },
          {
            key: 'model',
            type: 'text',
            title: 'Default Model ID (optional — leave blank to auto-detect from server)',
            placeholder: 'e.g. llama3.2:latest, gemma3:27b'
          }
        ]
      }
    },
    {
      when: "{{local.provider === 'ollama'}}",
      method: async (req, ondata) => {
        const baseUrl = (req.input.base_url || 'http://localhost:11434/v1').trim()
        const contextLength = parsePositiveInt(req.input.context_length, 8192)
        const update = {
          model: {
            base_url: baseUrl,
            context_length: contextLength
          }
        }
        const compactEnabled = (req.input.compact_mode || 'yes') === 'yes'
        if (compactEnabled) {
          await saveToConfigYaml({
            ...update,
            platform_toolsets: {
              cli: ['file', 'terminal', 'todo', 'clarify']
            }
          }, ondata)
          ondata({ raw: 'Enabled compact local toolset profile for lower context usage\r\n' })
        } else {
          await saveToConfigYaml(update, ondata)
        }
        if (req.input.model && req.input.model.trim()) {
          await saveModel(req.input.model, ondata)
        }
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

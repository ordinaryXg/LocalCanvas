# LocalCanvas v2 — 模型配置 + 生成器系统

> **版本目标**：接入模型配置与适配器，实现图像/视频/脚本生成全链路，画布从「可交互」变为「可产出」  
> **预计周期**：2.5 周（12 个工作日）  
> **前置条件**：v1 验收通过  
> **生成日期**：2026-06-04

---

## 一、版本功能清单

| # | 功能模块 | 子功能 | 优先级 | 依赖 |
|---|----------|--------|--------|------|
| 1 | 配置系统 | config.yaml 解析/读写 | P0 | — |
| 2 | 配置系统 | 首次引导流程 | P0 | #1 |
| 3 | 配置系统 | 模型配置 UI 面板 | P0 | #1 |
| 4 | 配置系统 | 连通性测试 | P1 | #3 |
| 5 | 适配器 | ModelAdapter 基类 | P0 | #1 |
| 6 | 适配器 | ComfyUI 适配器 | P0 | #5 |
| 7 | 适配器 | OpenAI 兼容适配器 | P0 | #5 |
| 8 | 适配器 | 适配器工厂 | P0 | #5 |
| 9 | 工作流模板 | ComfyUI workflow JSON 模板 | P0 | #6 |
| 10 | 生成器 | 生成器面板框架 | P0 | v1 节点组件 |
| 11 | 生成器 | 图像生成器面板 | P0 | #6, #10 |
| 12 | 生成器 | 视频生成器面板 | P0 | #6, #10 |
| 13 | 生成器 | 生成进度（WebSocket/轮询） | P0 | #6, #7 |
| 14 | 生成器 | 生成结果处理与保存 | P0 | #13 |
| 15 | 生成器 | 取消生成 | P1 | #13 |
| 16 | 脚本节点 | LLM 脚本生成 | P0 | #7 |
| 17 | 脚本节点 | 批量分镜图生成 | P0 | #11, #16 |
| 18 | 脚本节点 | 批量视频生成 | P0 | #12, #17 |
| 19 | 文本节点 | LLM 生成文本 | P1 | #7 |
| 20 | 生成队列 | 并发控制与队列管理 | P1 | #13 |

---

## 二、技术架构（v2 新增）

> **⚠️ 关键修正**：模型 API 调用和 WebSocket 监听必须在 Utility Process 中执行，不可在主进程中阻塞窗口消息循环。

```
┌───────────────────────────────────────────────────────────────┐
│ Main Process（v2 仅做 IPC 路由 + 数据库操作）                   │
│                                                                │
│ ├── IPC Handler（转发层）                                      │
│ │   ├── config:read / config:write / config:testConnection     │
│ │   ├── model:generateImage → 转发到 Utility Process          │
│ │   ├── model:generateVideo → 转发到 Utility Process          │
│ │   ├── model:generateText → 转发到 Utility Process           │
│ │   ├── model:cancel → 转发到 Utility Process                 │
│ │   └── model:progress ← Utility Process 推送 ← Renderer     │
│ │                                                              │
│ └── 配置服务                                                   │
│     ├── readConfig() → AppConfig                              │
│     ├── writeConfig(config) → void                            │
│     ├── testConnection(provider, endpoint) → boolean          │
│     └── 环境变量替换: ${VAR} → process.env.VAR                │
│                                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Utility Process（CPU/IO 密集操作，独立进程）                 ││
│ │ │                                                             ││
│ │ ├── 模型适配器层                                              ││
│ │ │   ├── ModelAdapter (抽象基类)                               ││
│ │ │   │   ├── generateImage(params) → EventEmitter              ││
│ │ │   │   ├── generateVideo(params) → EventEmitter              ││
│ │ │   │   ├── generateText(params) → Promise<string>            ││
│ │ │   │   ├── getStatus() → Promise<AdapterStatus>              ││
│ │ │   │   └── cancel(taskId) → void                             ││
│ │ │   ├── ComfyUIAdapter                                        ││
│ │ │   │   ├── REST: POST /prompt 提交任务                       ││
│ │ │   │   ├── WebSocket: /ws?clientId=xxx 监听进度              ││
│ │ │   │   ├── 下载: /view?filename=xxx&subfolder=&type=output  ││
│ │ │   │   └── 工作流: workflow JSON 模板 + 参数替换             ││
│ │ │   └── OpenAICompatibleAdapter                                ││
│ │ │       ├── generateText: POST /chat/completions (SSE)       ││
│ │ │       └── generateImage: POST /images/generations           ││
│ │ │                                                              ││
│ │ ├── 生成队列（持久化到 SQLite）                               ││
│ │ │   ├── TaskQueue (max_concurrent_tasks 控制)                  ││
│ │ │   ├── 任务状态: pending → running → completed/failed        ││
│ │ │   ├── 任务持久化: 写入 SQLite task_queue 表                 ││
│ │ │   ├── 崩溃恢复: 重启后恢复 pending/running 任务             ││
│ │ │   ├── 限流策略: 令牌桶 + 自适应并发                         ││
│ │ │   └── 通过 MessagePort 推送进度到 Main Process              ││
│ │ │                                                              ││
│ │ └── 日志 (electron-log Utility Process 实例)                 ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Renderer Process (v2 新增)                                   ││
│ │ ├── <GeneratorPanel> 底部浮动面板                            ││
│ │ │   ├── <ImageGenerator> 图像生成器                          ││
│ │ │   ├── <VideoGenerator> 视频生成器                          ││
│ │ │   └── <TextGenerator> 文本生成器                            ││
│ │ ├── <SettingsPanel> 模型配置面板                             ││
│ │ ├── <OnboardingGuide> 首次引导                              ││
│ │ └── 生成进度条（嵌入节点内）                                  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ 进程间通信：                                                   │
│ Renderer ←→ Main: ipcRenderer.invoke / ipcMain.handle         │
│ Main ←→ Utility: MessagePort (双向, 零序列化开销)             │
│ Utility → Main → Renderer: 进度推送链路                        │
└───────────────────────────────────────────────────────────────┘
```

---

## 三、config.yaml 配置规范

### 3.1 完整配置文件示例

```yaml
# ~/.localcanvas/config.yaml
# LocalCanvas 模型配置文件

# ─── 图像模型 ───
image_models:
  - id: "flux-dev"
    name: "FLUX.1 Dev"
    provider: "comfyui"
    endpoint: "http://127.0.0.1:8188"
    workflow: "flux_dev_api.json"
    max_resolution: 2048
    supported_ratios: ["1:1", "16:9", "9:16", "3:4", "4:3"]
    default_params:
      steps: 20
      cfg: 3.5
      sampler: "euler"

  - id: "sdxl"
    name: "Stable Diffusion XL"
    provider: "comfyui"
    endpoint: "http://127.0.0.1:8188"
    workflow: "sdxl_api.json"
    max_resolution: 2048
    supported_ratios: ["1:1", "16:9", "9:16"]

  - id: "dall-e-3"
    name: "DALL-E 3"
    provider: "openai_compatible"
    endpoint: "https://api.openai.com/v1/images/generations"
    api_key: "${OPENAI_API_KEY}"
    model: "dall-e-3"
    max_resolution: 1792

# ─── 视频模型 ───
video_models:
  - id: "cogvideox"
    name: "CogVideoX"
    provider: "comfyui"
    endpoint: "http://127.0.0.1:8188"
    workflow: "cogvideox_api.json"
    max_duration: 10
    supported_resolutions: ["720p", "1080p"]
    default_params:
      steps: 50
      cfg: 6.0

  - id: "cogvideox-5b"
    name: "CogVideoX-5B"
    provider: "comfyui"
    endpoint: "http://127.0.0.1:8188"
    workflow: "cogvideox_5b_api.json"
    max_duration: 10
    supported_resolutions: ["720p", "1080p"]

  - id: "animate-diff"
    name: "AnimateDiff"
    provider: "comfyui"
    endpoint: "http://127.0.0.1:8188"
    workflow: "animatediff_api.json"
    max_duration: 5
    supported_resolutions: ["512x512", "768x512"]

# ─── LLM 模型 ───
llm_models:
  - id: "qwen3"
    name: "Qwen3"
    provider: "openai_compatible"
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    api_key: "${DASHSCOPE_API_KEY}"
    model: "qwen-max"
    max_tokens: 4096

  - id: "deepseek"
    name: "DeepSeek"
    provider: "openai_compatible"
    endpoint: "https://api.deepseek.com/v1/chat/completions"
    api_key: "${DEEPSEEK_API_KEY}"
    model: "deepseek-chat"
    max_tokens: 4096

  - id: "glm-4"
    name: "GLM-4"
    provider: "openai_compatible"
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    api_key: "${ZHIPU_API_KEY}"
    model: "glm-4-flash"
    max_tokens: 4096

# ─── TTS 模型 ───
tts_models:
  - id: "cosyvoice"
    name: "CosyVoice"
    provider: "custom"
    endpoint: "http://127.0.0.1:50000/tts"
    method: "POST"

# ─── 通用设置 ───
settings:
  default_image_model: "flux-dev"
  default_video_model: "cogvideox"
  default_llm: "qwen3"
  output_dir: "~/LocalCanvas/outputs"
  temp_dir: "~/LocalCanvas/.temp"
  max_concurrent_tasks: 3
  auto_save_interval: 30
  ffmpeg_path: ""           # 空则自动检测
```

### 3.2 AppConfig 类型定义

**文件**：`src/types/config.ts`

```typescript
export interface ImageModelConfig {
  id: string
  name: string
  provider: 'comfyui' | 'openai_compatible' | 'replicate' | 'custom'
  endpoint: string
  api_key?: string
  model?: string
  workflow?: string           // ComfyUI 专用
  max_resolution?: number
  supported_ratios?: string[]
  default_params?: Record<string, any>
}

export interface VideoModelConfig {
  id: string
  name: string
  provider: 'comfyui' | 'openai_compatible' | 'replicate' | 'custom'
  endpoint: string
  api_key?: string
  model?: string
  workflow?: string
  max_duration?: number
  supported_resolutions?: string[]
  default_params?: Record<string, any>
}

export interface LLMModelConfig {
  id: string
  name: string
  provider: 'openai_compatible' | 'custom'
  endpoint: string
  api_key?: string
  model: string
  max_tokens?: number
}

export interface TTSModelConfig {
  id: string
  name: string
  provider: 'custom'
  endpoint: string
  method?: string
}

export interface AppSettings {
  default_image_model: string
  default_video_model: string
  default_llm: string
  output_dir: string
  temp_dir: string
  max_concurrent_tasks: number
  auto_save_interval: number
  ffmpeg_path: string
}

export interface AppConfig {
  image_models: ImageModelConfig[]
  video_models: VideoModelConfig[]
  llm_models: LLMModelConfig[]
  tts_models: TTSModelConfig[]
  settings: AppSettings
}
```

---

## 四、详细开发步骤

### Day 1-2：配置系统

#### Step 2.1.1 配置服务

**文件**：`electron/main/services/config.ts`

```typescript
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import yaml from 'yaml'
import type { AppConfig } from '../../../src/types/config'

const CONFIG_PATH = join(app.getPath('userData'), 'LocalCanvas', 'config.yaml')

const DEFAULT_CONFIG: AppConfig = {
  image_models: [],
  video_models: [],
  llm_models: [],
  tts_models: [],
  settings: {
    default_image_model: '',
    default_video_model: '',
    default_llm: '',
    output_dir: join(app.getPath('home'), 'LocalCanvas', 'outputs'),
    temp_dir: join(app.getPath('home'), 'LocalCanvas', '.temp'),
    max_concurrent_tasks: 3,
    auto_save_interval: 30,
    ffmpeg_path: '',
  },
}

export async function readConfig(): Promise<AppConfig> {
  if (!existsSync(CONFIG_PATH)) {
    await ensureConfigDir()
    await writeConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }

  const raw = await readFile(CONFIG_PATH, 'utf-8')
  let parsed = yaml.parse(raw) as AppConfig

  // 环境变量替换 ${VAR_NAME}
  parsed = replaceEnvVars(parsed)

  return parsed
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await ensureConfigDir()
  const content = yaml.stringify(config, { lineWidth: 0 })
  await writeFile(CONFIG_PATH, content, 'utf-8')
}

export async function testConnection(
  provider: string,
  endpoint: string,
  apiKey?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const axios = require('axios')
    const url = provider === 'comfyui'
      ? `${endpoint}/system_stats`
      : endpoint.replace(/\/chat\/completions.*/, '/models')

    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const res = await axios.get(url, { headers, timeout: 10000 })
    return { ok: res.status === 200, message: '连接成功' }
  } catch (err: any) {
    return { ok: false, message: err.message || '连接失败' }
  }
}

function replaceEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => process.env[varName] || '')
  }
  if (Array.isArray(obj)) return obj.map(replaceEnvVars)
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      result[key] = replaceEnvVars(obj[key])
    }
    return result
  }
  return obj
}

async function ensureConfigDir() {
  const dir = join(CONFIG_PATH, '..')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
}
```

---

#### Step 2.1.2 配置 UI 面板

**文件**：`src/components/panels/SettingsPanel.tsx`

```tsx
import { useState, useEffect } from 'react'

interface ModelEntry {
  id: string
  name: string
  provider: string
  endpoint: string
  api_key?: string
  workflow?: string
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'llm' | 'settings'>('image')
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    window.api.config.read().then(setConfig)
  }, [])

  if (!config) return <div className="p-4 text-gray-400">加载配置中...</div>

  const models = activeTab === 'image' ? config.image_models
    : activeTab === 'video' ? config.video_models
    : activeTab === 'llm' ? config.llm_models
    : []

  const handleTest = async (model: ModelEntry) => {
    setTesting(model.id)
    const result = await window.api.config.testConnection(model.provider, model.endpoint, model.api_key)
    setTesting(null)
    alert(result.ok ? `✅ ${result.message}` : `❌ ${result.message}`)
  }

  const handleSave = async () => {
    await window.api.config.write(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[700px] max-h-[80vh] bg-[#16213e] rounded-xl border border-[#0f3460] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0f3460]">
          <h2 className="text-lg font-semibold text-white">⚙️ 模型配置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-[#0f3460]">
          {(['image', 'video', 'llm', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm transition
                ${activeTab === tab ? 'text-[#6366f1] border-b-2 border-[#6366f1]' : 'text-gray-400 hover:text-white'}`}
            >
              {{ image: '🖼️ 图像', video: '🎥 视频', llm: '🤖 LLM', settings: '⚙️ 设置' }[tab]}
            </button>
          ))}
        </div>

        {/* 模型列表 */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab !== 'settings' ? (
            <div className="space-y-3">
              {models.map((model: ModelEntry, i: number) => (
                <div key={model.id} className="bg-[#0f3460] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{model.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTest(model)}
                        disabled={testing === model.id}
                        className="text-xs px-3 py-1 bg-[#6366f1]/20 text-[#6366f1] rounded hover:bg-[#6366f1]/40 transition"
                      >
                        {testing === model.id ? '测试中...' : '测试连接'}
                      </button>
                      <button className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition">
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Provider: <span className="text-gray-200">{model.provider}</span></div>
                    <div>Endpoint: <span className="text-gray-200 truncate">{model.endpoint}</span></div>
                    {model.workflow && <div>Workflow: <span className="text-gray-200">{model.workflow}</span></div>}
                    <div>API Key: <span className="text-gray-200">{model.api_key ? '●●●●●●' : '未设置'}</span></div>
                  </div>
                </div>
              ))}

              {/* 添加模型按钮 */}
              <button className="w-full py-3 border-2 border-dashed border-[#0f3460] rounded-lg text-gray-400 hover:text-white hover:border-[#6366f1] transition text-sm">
                + 添加模型
              </button>
            </div>
          ) : (
            /* 通用设置 */
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">默认图像模型</label>
                <select value={config.settings.default_image_model}
                  onChange={(e) => setConfig({ ...config, settings: { ...config.settings, default_image_model: e.target.value } })}
                  className="w-full bg-[#0f3460] text-white px-3 py-2 rounded outline-none">
                  {config.image_models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">默认视频模型</label>
                <select value={config.settings.default_video_model}
                  onChange={(e) => setConfig({ ...config, settings: { ...config.settings, default_video_model: e.target.value } })}
                  className="w-full bg-[#0f3460] text-white px-3 py-2 rounded outline-none">
                  {config.video_models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">最大并发任务</label>
                <input type="number" value={config.settings.max_concurrent_tasks} min={1} max={10}
                  onChange={(e) => setConfig({ ...config, settings: { ...config.settings, max_concurrent_tasks: parseInt(e.target.value) } }})}
                  className="w-full bg-[#0f3460] text-white px-3 py-2 rounded outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">输出目录</label>
                <input type="text" value={config.settings.output_dir}
                  onChange={(e) => setConfig({ ...config, settings: { ...config.settings, output_dir: e.target.value } })}
                  className="w-full bg-[#0f3460] text-white px-3 py-2 rounded outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#0f3460]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm bg-[#6366f1] text-white rounded-lg hover:bg-[#5254d4]">保存配置</button>
        </div>
      </div>
    </div>
  )
}
```

---

#### Step 2.1.3 首次引导

**文件**：`src/components/panels/OnboardingGuide.tsx`

```tsx
import { useState } from 'react'

export function OnboardingGuide({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [comfyuiUrl, setComfyuiUrl] = useState('http://127.0.0.1:8188')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    const result = await window.api.config.testConnection('comfyui', comfyuiUrl)
    setTestResult(result)
    setTesting(false)
  }

  const handleComplete = async () => {
    // 保存基础配置
    const config = await window.api.config.read()
    config.image_models.push({
      id: 'flux-dev',
      name: 'FLUX.1 Dev',
      provider: 'comfyui',
      endpoint: comfyuiUrl,
      workflow: 'flux_dev_api.json',
      max_resolution: 2048,
      supported_ratios: ['1:1', '16:9', '9:16'],
    })
    config.settings.default_image_model = 'flux-dev'
    await window.api.config.write(config)
    onComplete()
  }

  const steps = [
    {
      title: '欢迎使用 LocalCanvas！',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-gray-300 mb-6">
            LocalCanvas 是一个本地化的 AI 视频创作画布工具。<br />
            接下来需要配置你的第一个模型端点。
          </p>
          <button onClick={() => setStep(1)} className="bg-[#6366f1] text-white px-8 py-3 rounded-lg hover:bg-[#5254d4]">
            开始配置 →
          </button>
        </div>
      ),
    },
    {
      title: '配置 ComfyUI',
      content: (
        <div>
          <p className="text-gray-300 mb-4">
            如果你已经在本地安装了 ComfyUI，填写其地址即可开始使用。
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">ComfyUI 地址</label>
              <input
                value={comfyuiUrl}
                onChange={(e) => setComfyuiUrl(e.target.value)}
                className="w-full bg-[#0f3460] text-white px-4 py-2 rounded-lg outline-none"
              />
            </div>
            <button onClick={handleTest} disabled={testing}
              className="w-full bg-[#6366f1]/20 text-[#6366f1] py-2 rounded-lg hover:bg-[#6366f1]/40 transition">
              {testing ? '测试中...' : '🔍 测试连接'}
            </button>
            {testResult && (
              <div className={`text-sm p-3 rounded ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.ok ? '✅ 连接成功！ComfyUI 已就绪' : `❌ ${testResult.message}`}
              </div>
            )}
            <p className="text-xs text-gray-500">
              如果没有安装 ComfyUI，可以跳过此步骤，稍后在设置中配置。
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-gray-400">← 上一步</button>
            <button onClick={handleComplete} className="flex-1 bg-[#6366f1] text-white py-2 rounded-lg hover:bg-[#5254d4]">
              完成配置 →
            </button>
            <button onClick={onComplete} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300">
              跳过
            </button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]">
      <div className="w-[500px]">
        <h1 className="text-2xl font-bold text-white mb-6">{steps[step].title}</h1>
        {steps[step].content}
      </div>
    </div>
  )
}
```

**验收**：首次启动检测无 config.yaml 时弹出引导流程

---

### Day 3-5：模型适配器

#### Step 2.2.1 适配器基类

**文件**：`electron/main/services/model-adapter/base.ts`

```typescript
import { EventEmitter } from 'events'

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  model: string
  seed?: number
  steps?: number
  cfg?: number
  referenceImage?: string  // base64 or file path
  referenceStrength?: number
  batchSize?: number
}

export interface GenerateVideoParams {
  prompt: string
  width: number
  height: number
  duration: number
  model: string
  firstFrame?: string
  lastFrame?: string
  seed?: number
  steps?: number
  cfg?: number
  camera?: string
}

export interface GenerateTextParams {
  prompt: string
  systemPrompt?: string
  model: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface AdapterStatus {
  available: boolean
  message: string
  models?: string[]
}

export abstract class ModelAdapter extends EventEmitter {
  abstract generateImage(params: GenerateImageParams): Promise<string>  // 返回输出文件路径
  abstract generateVideo(params: GenerateVideoParams): Promise<string>
  abstract generateText(params: GenerateTextParams): Promise<string>
  abstract getStatus(): Promise<AdapterStatus>
  abstract cancel(taskId: string): void
}
```

---

#### Step 2.2.2 ComfyUI 适配器

**文件**：`electron/main/services/model-adapter/comfyui.ts`

```typescript
import { EventEmitter } from 'events'
import axios from 'axios'
import WebSocket from 'ws'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { ModelAdapter, GenerateImageParams, GenerateVideoParams, GenerateTextParams, AdapterStatus } from './base'

export class ComfyUIAdapter extends ModelAdapter {
  private endpoint: string
  private workflowDir: string
  private outputDir: string
  private clientId: string
  private activeTasks: Map<string, { ws: WebSocket; promptId: string }> = new Map()

  constructor(endpoint: string, workflowDir: string, outputDir: string) {
    super()
    this.endpoint = endpoint
    this.workflowDir = workflowDir
    this.outputDir = outputDir
    this.clientId = uuid()
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    const workflowTemplate = await this.loadWorkflow(params.model || 'flux_dev_api')
    const workflow = this.fillWorkflowParams(workflowTemplate, {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || '',
      width: params.width,
      height: params.height,
      seed: params.seed || Math.floor(Math.random() * 2147483647),
      steps: params.steps || 20,
      cfg: params.cfg || 3.5,
      batch_size: params.batchSize || 1,
    })

    return this.submitAndAwait(workflow)
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const workflowTemplate = await this.loadWorkflow(params.model || 'video_api')
    const workflow = this.fillWorkflowParams(workflowTemplate, {
      prompt: params.prompt,
      width: params.width,
      height: params.height,
      duration: params.duration,
      seed: params.seed || Math.floor(Math.random() * 2147483647),
      steps: params.steps || 50,
      cfg: params.cfg || 6.0,
      first_frame: params.firstFrame || '',
      last_frame: params.lastFrame || '',
    })

    return this.submitAndAwait(workflow)
  }

  async generateText(_params: GenerateTextParams): Promise<string> {
    throw new Error('ComfyUI adapter does not support text generation. Use OpenAI compatible adapter.')
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      const res = await axios.get(`${this.endpoint}/system_stats`, { timeout: 5000 })
      return {
        available: true,
        message: 'ComfyUI 在线',
        models: res.data?.models?.diffusion_models || [],
      }
    } catch {
      return { available: false, message: 'ComfyUI 离线或无法连接' }
    }
  }

  cancel(taskId: string): void {
    const task = this.activeTasks.get(taskId)
    if (task) {
      task.ws.close()
      this.activeTasks.delete(taskId)
    }
  }

  // ─── 内部方法 ───

  private async loadWorkflow(name: string): Promise<any> {
    const path = join(this.workflowDir, `${name}.json`)
    if (!existsSync(path)) {
      throw new Error(`Workflow template not found: ${path}`)
    }
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  }

  private fillWorkflowParams(template: any, params: Record<string, any>): any {
    const workflow = JSON.parse(JSON.stringify(template))

    // 遍历所有节点，替换占位符
    for (const nodeId of Object.keys(workflow)) {
      const node = workflow[nodeId]
      if (!node.inputs) continue

      for (const key of Object.keys(node.inputs)) {
        const val = node.inputs[key]
        if (typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}')) {
          const paramName = val.slice(2, -2).trim()
          if (params[paramName] !== undefined) {
            node.inputs[key] = params[paramName]
          }
        }
      }
    }

    return workflow
  }

  private async submitAndAwait(workflow: any): Promise<string> {
    const taskId = uuid()

    // 1. 提交任务
    const res = await axios.post(`${this.endpoint}/prompt`, {
      prompt: workflow,
      client_id: this.clientId,
    })

    const promptId = res.data.prompt_id

    // 2. WebSocket 监听进度
    return new Promise((resolve, reject) => {
      const wsUrl = this.endpoint.replace('http', 'ws') + `/ws?clientId=${this.clientId}`
      const ws = new WebSocket(wsUrl)

      this.activeTasks.set(taskId, { ws, promptId })

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString())

        switch (msg.type) {
          case 'progress':
            this.emit('progress', {
              taskId,
              promptId,
              value: msg.data.value,
              max: msg.data.max,
              percentage: Math.round((msg.data.value / msg.data.max) * 100),
            })
            break

          case 'executing':
            if (msg.data.node === null) {
              // 执行完成
              ws.close()
              this.activeTasks.delete(taskId)
              this.handleCompleted(promptId).then(resolve).catch(reject)
            }
            break

          case 'execution_error':
            ws.close()
            this.activeTasks.delete(taskId)
            reject(new Error(msg.data.exception_message || 'ComfyUI 执行错误'))
            break
        }
      })

      ws.on('error', (err) => {
        this.activeTasks.delete(taskId)
        reject(err)
      })

      ws.on('close', () => {
        this.activeTasks.delete(taskId)
      })
    })
  }

  private async handleCompleted(promptId: string): Promise<string> {
    // 获取输出文件
    const res = await axios.get(`${this.endpoint}/history/${promptId}`)
    const outputs = res.data?.[promptId]?.outputs || {}

    // 找到输出节点中的文件
    for (const nodeId of Object.keys(outputs)) {
      const output = outputs[nodeId]
      if (output.images) {
        for (const img of output.images) {
          const filename = img.filename
          const subfolder = img.subfolder || ''
          const type = img.type || 'output'

          // 下载文件
          const downloadUrl = `${this.endpoint}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`
          const fileRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' })

          // 保存到本地
          await mkdir(this.outputDir, { recursive: true })
          const localPath = join(this.outputDir, `${Date.now()}-${filename}`)
          await writeFile(localPath, Buffer.from(fileRes.data))

          return localPath
        }
      }
      if (output.videos) {
        for (const vid of output.videos) {
          const filename = vid.filename
          const subfolder = vid.subfolder || ''

          const downloadUrl = `${this.endpoint}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`
          const fileRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' })

          await mkdir(this.outputDir, { recursive: true })
          const localPath = join(this.outputDir, `${Date.now()}-${filename}`)
          await writeFile(localPath, Buffer.from(fileRes.data))

          return localPath
        }
      }
    }

    throw new Error('No output found in ComfyUI response')
  }
}
```

**验收**：可通过 ComfyUI 完成文生图和图生视频

---

#### Step 2.2.3 OpenAI 兼容适配器

**文件**：`electron/main/services/model-adapter/openai-compat.ts`

```typescript
import axios from 'axios'
import { ModelAdapter, GenerateImageParams, GenerateVideoParams, GenerateTextParams, AdapterStatus } from './base'

export class OpenAICompatibleAdapter extends ModelAdapter {
  private endpoint: string
  private apiKey: string
  private model: string

  constructor(endpoint: string, apiKey: string, model: string) {
    super()
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.model = model
  }

  async generateImage(params: GenerateImageParams): Promise<string> {
    // 对于 DALL-E 等支持图像生成的 OpenAI 兼容接口
    const res = await axios.post(
      this.endpoint,
      {
        model: this.model,
        prompt: params.prompt,
        n: params.batchSize || 1,
        size: `${params.width}x${params.height}`,
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 120000,
      }
    )

    // 下载图片
    const imageUrl = res.data.data[0]?.url || res.data.data[0]?.b64_json
    if (imageUrl?.startsWith('http')) {
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      // 保存到本地
      const localPath = `~/LocalCanvas/outputs/${Date.now()}.png`
      require('fs').writeFileSync(localPath, imgRes.data)
      return localPath
    } else if (imageUrl) {
      // base64
      const buffer = Buffer.from(imageUrl, 'base64')
      const localPath = `~/LocalCanvas/outputs/${Date.now()}.png`
      require('fs').writeFileSync(localPath, buffer)
      return localPath
    }

    throw new Error('No image in response')
  }

  async generateVideo(_params: GenerateVideoParams): Promise<string> {
    throw new Error('OpenAI compatible adapter does not support video generation yet')
  }

  async generateText(params: GenerateTextParams): Promise<string> {
    const res = await axios.post(
      this.endpoint,
      {
        model: this.model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.prompt },
        ],
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature || 0.7,
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    )

    return res.data.choices[0]?.message?.content || ''
  }

  async getStatus(): Promise<AdapterStatus> {
    try {
      const modelsUrl = this.endpoint.replace(/\/chat\/completions.*/, '/models')
      await axios.get(modelsUrl, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000,
      })
      return { available: true, message: 'API 在线' }
    } catch {
      return { available: false, message: 'API 不可达' }
    }
  }

  cancel(_taskId: string): void {
    // OpenAI 兼容接口无取消机制
  }
}
```

**验收**：可调用 Qwen/DeepSeek 等 OpenAI 兼容接口生成文本

---

#### Step 2.2.4 适配器工厂

**文件**：`electron/main/services/model-adapter/factory.ts`

```typescript
import { ModelAdapter } from './base'
import { ComfyUIAdapter } from './comfyui'
import { OpenAICompatibleAdapter } from './openai-compat'
import type { ImageModelConfig, VideoModelConfig, LLMModelConfig } from '../../../src/types/config'

export class AdapterFactory {
  private static instances: Map<string, ModelAdapter> = new Map()

  static getImageAdapter(config: ImageModelConfig, outputDir: string): ModelAdapter {
    const key = `image:${config.id}`
    if (this.instances.has(key)) return this.instances.get(key)!

    let adapter: ModelAdapter
    switch (config.provider) {
      case 'comfyui':
        adapter = new ComfyUIAdapter(config.endpoint, './resources/workflows', outputDir)
        break
      case 'openai_compatible':
        adapter = new OpenAICompatibleAdapter(config.endpoint!, config.api_key || '', config.model || '')
        break
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.instances.set(key, adapter)
    return adapter
  }

  static getVideoAdapter(config: VideoModelConfig, outputDir: string): ModelAdapter {
    const key = `video:${config.id}`
    if (this.instances.has(key)) return this.instances.get(key)!

    let adapter: ModelAdapter
    switch (config.provider) {
      case 'comfyui':
        adapter = new ComfyUIAdapter(config.endpoint, './resources/workflows', outputDir)
        break
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.instances.set(key, adapter)
    return adapter
  }

  static getLLMAdapter(config: LLMModelConfig): ModelAdapter {
    const key = `llm:${config.id}`
    if (this.instances.has(key)) return this.instances.get(key)!

    return new OpenAICompatibleAdapter(config.endpoint, config.api_key || '', config.model)
  }

  static clear() {
    this.instances.clear()
  }
}
```

---

### Day 6-8：生成器面板

#### Step 2.3.1 生成器面板框架

**文件**：`src/components/panels/GeneratorPanel.tsx`

```tsx
import { useEffect, useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { ImageGenerator } from './ImageGenerator'
import { VideoGenerator } from './VideoGenerator'
import { TextGenerator } from './TextGenerator'

export function GeneratorPanel() {
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds)
  const nodes = useCanvasStore(s => s.nodes)
  const [isVisible, setIsVisible] = useState(false)

  const selectedNode = nodes.find(n => selectedNodeIds.includes(n.id))

  useEffect(() => {
    setIsVisible(!!selectedNode && ['text', 'image', 'video'].includes(selectedNode.type || ''))
  }, [selectedNodeIds, nodes])

  if (!isVisible || !selectedNode) return null

  return (
    <div className="absolute bottom-0 left-14 right-0 z-40 animate-slide-up">
      <div className="bg-[#16213e]/95 backdrop-blur border-t border-[#0f3460] px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {selectedNode.type === 'text' ? '📝 文本生成器' :
             selectedNode.type === 'image' ? '🖼️ 图像生成器' :
             '🎥 视频生成器'}
          </span>
          <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white text-xs">收起 ▼</button>
        </div>

        {selectedNode.type === 'text' && <TextGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'image' && <ImageGenerator nodeId={selectedNode.id} />}
        {selectedNode.type === 'video' && <VideoGenerator nodeId={selectedNode.id} />}
      </div>
    </div>
  )
}
```

---

#### Step 2.3.2 图像生成器

**文件**：`src/components/panels/ImageGenerator.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'

interface Props {
  nodeId: string
}

export function ImageGenerator({ nodeId }: Props) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const nodes = useCanvasStore(s => s.nodes)
  const node = nodes.find(n => n.id === nodeId)
  const data = node?.data || {}

  const [prompt, setPrompt] = useState(data.prompt || '')
  const [negativePrompt, setNegativePrompt] = useState(data.negativePrompt || '')
  const [modelId, setModelId] = useState(data.modelId || '')
  const [ratio, setRatio] = useState(data.ratio || '16:9')
  const [batchSize, setBatchSize] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  // 从 config 读取可用模型
  const [imageModels, setImageModels] = useState<any[]>([])
  useEffect(() => {
    window.api.config.read().then(config => setImageModels(config.image_models || []))
  }, [])

  const ratioMap: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '16:9': [1344, 768],
    '9:16': [768, 1344],
    '3:4': [896, 1152],
    '4:3': [1152, 896],
  }

  const handleGenerate = async () => {
    if (!modelId || !prompt) return
    setIsGenerating(true)
    setProgress(0)

    const model = imageModels.find(m => m.id === modelId)
    const [width, height] = ratioMap[ratio] || [1024, 1024]

    try {
      // 监听进度
      const unsub = window.api.on('model:progress', (p: any) => {
        if (p.nodeId === nodeId) setProgress(p.percentage)
      })

      const resultPath = await window.api.model.generateImage({
        prompt,
        negativePrompt,
        width,
        height,
        model: model?.workflow || modelId,
        batchSize,
      })

      // 更新节点数据
      updateNodeData(nodeId, {
        imageSrc: `file://${resultPath}`,
        fileName: resultPath.split('/').pop(),
        prompt,
        negativePrompt,
        modelId,
        ratio,
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      console.error('生成失败:', err)
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex gap-4 items-start">
      {/* 左侧：提示词 */}
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-gray-500">正向提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面..."
            className="w-full h-16 bg-[#0f3460] text-white text-xs p-2 rounded resize-none outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">反向提示词</label>
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="低质量, 模糊, 变形..."
            className="w-full bg-[#0f3460] text-white text-xs p-2 rounded outline-none"
          />
        </div>
      </div>

      {/* 右侧：参数 */}
      <div className="w-56 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">模型</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              <option value="">选择模型</option>
              {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="w-20">
            <label className="text-[10px] text-gray-500">比例</label>
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              {['1:1', '16:9', '9:16', '3:4', '4:3'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-16">
            <label className="text-[10px] text-gray-500">数量</label>
            <select value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              {[1, 2, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !modelId || !prompt}
            className="flex-1 bg-[#06b6d4] text-white text-sm py-1.5 rounded hover:bg-[#0891b2] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isGenerating ? `生成中 ${progress}%` : '✨ 生成'}
          </button>
        </div>
        {/* 进度条 */}
        {isGenerating && (
          <div className="w-full bg-[#0f3460] rounded-full h-1.5">
            <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

#### Step 2.3.3 视频生成器

**文件**：`src/components/panels/VideoGenerator.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'

interface Props {
  nodeId: string
}

export function VideoGenerator({ nodeId }: Props) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const nodes = useCanvasStore(s => s.nodes)
  const node = nodes.find(n => n.id === nodeId)
  const data = node?.data || {}

  const [prompt, setPrompt] = useState(data.prompt || '')
  const [modelId, setModelId] = useState(data.modelId || '')
  const [duration, setDuration] = useState(data.duration || 5)
  const [camera, setCamera] = useState(data.camera || '静止')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const [videoModels, setVideoModels] = useState<any[]>([])
  useEffect(() => {
    window.api.config.read().then(config => setVideoModels(config.video_models || []))
  }, [])

  const cameraPresets = ['静止', '左移', '右移', '推近', '拉远', '环绕']

  // 检查连线获取首帧/尾帧
  const edges = useCanvasStore(s => s.edges)
  const firstFrameEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'firstFrame')
  const lastFrameEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'lastFrame')

  const handleGenerate = async () => {
    if (!modelId || !prompt) return
    setIsGenerating(true)
    setProgress(0)

    try {
      const model = videoModels.find(m => m.id === modelId)
      const resultPath = await window.api.model.generateVideo({
        prompt,
        width: 1280,
        height: 720,
        duration,
        model: model?.workflow || modelId,
        firstFrame: firstFrameEdge ? nodes.find(n => n.id === firstFrameEdge.source)?.data.imageSrc : undefined,
        lastFrame: lastFrameEdge ? nodes.find(n => n.id === lastFrameEdge.source)?.data.imageSrc : undefined,
        camera,
      })

      updateNodeData(nodeId, {
        videoSrc: `file://${resultPath}`,
        fileName: resultPath.split('/').pop(),
        prompt,
        modelId,
        duration,
        camera,
        isGenerating: false,
        progress: 100,
      })
    } catch (err) {
      console.error('视频生成失败:', err)
      updateNodeData(nodeId, { isGenerating: false, error: String(err) })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-2">
        <div>
          <label className="text-[10px] text-gray-500">画面描述</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述视频画面和运动..."
            className="w-full h-16 bg-[#0f3460] text-white text-xs p-2 rounded resize-none outline-none"
          />
        </div>
        {/* 首尾帧预览 */}
        <div className="flex gap-2">
          {firstFrameEdge && (
            <div className="w-16 h-10 rounded overflow-hidden border border-[#0f3460]">
              <img src={nodes.find(n => n.id === firstFrameEdge.source)?.data.imageSrc}
                className="w-full h-full object-cover" alt="首帧" />
            </div>
          )}
          {lastFrameEdge && (
            <div className="w-16 h-10 rounded overflow-hidden border border-[#0f3460]">
              <img src={nodes.find(n => n.id === lastFrameEdge.source)?.data.imageSrc}
                className="w-full h-full object-cover" alt="尾帧" />
            </div>
          )}
        </div>
      </div>

      <div className="w-56 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">模型</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              <option value="">选择模型</option>
              {videoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-16">
            <label className="text-[10px] text-gray-500">时长</label>
            <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              {[3, 5, 10].map(d => <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">运镜</label>
            <select value={camera} onChange={(e) => setCamera(e.target.value)}
              className="w-full bg-[#0f3460] text-white text-xs p-1.5 rounded outline-none">
              {cameraPresets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !modelId || !prompt}
          className="w-full bg-[#f43f5e] text-white text-sm py-1.5 rounded hover:bg-[#e11d48] disabled:opacity-50 transition"
        >
          {isGenerating ? `生成中 ${progress}%` : '✨ 生成视频'}
        </button>
        {isGenerating && (
          <div className="w-full bg-[#0f3460] rounded-full h-1.5">
            <div className="bg-rose-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Day 9-10：脚本节点完善

#### Step 2.4.1 LLM 脚本生成

**文件**：`electron/main/services/script-generator.ts`

```typescript
import type { LLMModelConfig } from '../../src/types/config'

const SCRIPT_SYSTEM_PROMPT = `你是一位专业的视频脚本编剧。用户会给你一个故事梗概，你需要将其拆解为视频分镜脚本。

请严格按照以下 JSON 格式输出，不要包含任何其他文本：

{
  "title": "脚本标题",
  "rows": [
    {
      "sequence": 1,
      "description": "画面描述（中文，50字以内）",
      "prompt": "图像生成用英文提示词",
      "duration": 5,
      "camera": "静止/左移/右移/推近/拉远/环绕"
    }
  ]
}

要求：
1. 每个分镜时长 3-10 秒
2. 分镜数量 4-8 个
3. prompt 必须是英文，适合图像生成
4. camera 从预设中选择
5. 画面连贯，故事完整`

export async function generateScript(
  storyInput: string,
  characterInput: string,
  llmConfig: LLMModelConfig,
): Promise<any> {
  const axios = require('axios')
  const userContent = characterInput
    ? `故事梗概：${storyInput}\n\n角色描述：${characterInput}`
    : `故事梗概：${storyInput}`

  const res = await axios.post(
    llmConfig.endpoint,
    {
      model: llmConfig.model,
      messages: [
        { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 4096,
      temperature: 0.8,
    },
    {
      headers: {
        'Authorization': `Bearer ${llmConfig.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  const content = res.data.choices[0]?.message?.content || ''

  // 尝试解析 JSON
  try {
    // 去除 markdown 代码块标记
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonStr)
  } catch {
    throw new Error(`LLM 输出格式错误，无法解析为 JSON: ${content.substring(0, 200)}`)
  }
}
```

---

#### Step 2.4.2 批量生成流程

**文件**：`electron/main/services/batch-generator.ts`

```typescript
import { EventEmitter } from 'events'

interface BatchTask {
  sequence: number
  prompt: string
  duration?: number
  camera?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  resultPath?: string
  error?: string
}

export class BatchGenerator extends EventEmitter {
  private maxConcurrent: number

  constructor(maxConcurrent: number = 3) {
    super()
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 批量生成分镜图
   * @param tasks 分镜任务列表
   * @param imageAdapter 图像适配器
   * @param params 通用图像参数
   */
  async batchGenerateImages(
    tasks: BatchTask[],
    imageAdapter: any,
    params: { width: number; height: number; model: string; steps?: number; cfg?: number },
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>()
    let running = 0
    let index = 0

    return new Promise((resolve, reject) => {
      const runNext = () => {
        while (running < this.maxConcurrent && index < tasks.length) {
          const task = tasks[index++]
          running++
          task.status = 'running'

          imageAdapter.generateImage({
            prompt: task.prompt,
            width: params.width,
            height: params.height,
            model: params.model,
            steps: params.steps,
            cfg: params.cfg,
          }).then((path: string) => {
            task.status = 'completed'
            task.resultPath = path
            results.set(task.sequence, path)
            running--
            this.emit('progress', { completed: results.size, total: tasks.length, current: task.sequence })

            if (results.size === tasks.length) {
              resolve(results)
            } else {
              runNext()
            }
          }).catch((err: Error) => {
            task.status = 'failed'
            task.error = err.message
            running--
            this.emit('error', { sequence: task.sequence, error: err.message })
            runNext()
          })
        }

        if (results.size + tasks.filter(t => t.status === 'failed').length === tasks.length) {
          resolve(results)
        }
      }

      runNext()
    })
  }

  /**
   * 批量生成视频
   */
  async batchGenerateVideos(
    imagePaths: Map<number, string>,
    videoAdapter: any,
    params: { width: number; height: number; duration: number; model: string },
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>()
    const entries = Array.from(imagePaths.entries())
    let running = 0
    let index = 0

    return new Promise((resolve) => {
      const runNext = () => {
        while (running < this.maxConcurrent && index < entries.length) {
          const [seq, imagePath] = entries[index++]
          running++

          videoAdapter.generateVideo({
            prompt: '',
            width: params.width,
            height: params.height,
            duration: params.duration,
            model: params.model,
            firstFrame: imagePath,
          }).then((path: string) => {
            results.set(seq, path)
            running--
            this.emit('progress', { completed: results.size, total: entries.length, current: seq })
            if (results.size === entries.length) resolve(results)
            else runNext()
          }).catch(() => {
            running--
            runNext()
          })
        }

        if (results.size + (entries.length - index - running) >= entries.length) {
          resolve(results)
        }
      }

      runNext()
    })
  }
}
```

**验收**：脚本节点可生成脚本 → 批量分镜图 → 批量视频，自动创建节点并连线

---

### Day 11-12：生成队列 + 错误处理 + 联调

#### Step 2.5.1 生成队列

**文件**：`electron/main/services/task-queue.ts`

```typescript
import { EventEmitter } from 'events'

export interface GenerateTask {
  id: string
  type: 'image' | 'video' | 'text'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  params: any
  result?: string
  error?: string
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// ⚠️ 修订：TaskQueue 改为 SQLite 持久化，解决内存队列崩溃丢失 + 重启恢复问题
// 运行在 Utility Process 中，不阻塞主进程

interface GenerateTask {
  id: string
  type: 'image' | 'video' | 'text'
  nodeId: string
  modelId: string
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string
  error?: string
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  retryCount: number       // 重试次数
  maxRetries: number       // 最大重试次数（默认3）
}

// SQLite task_queue 表定义
/*
CREATE TABLE task_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  node_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  params TEXT NOT NULL,        -- JSON
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  error TEXT,
  progress REAL NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX idx_task_queue_status ON task_queue(status);
*/

export class TaskQueue extends EventEmitter {
  private db: Database       // better-sqlite3 实例（Utility Process 侧）
  private running: Set<string> = new Set()
  private maxConcurrent: number
  private rateLimiter: TokenBucket  // 令牌桶限流

  constructor(db: Database, maxConcurrent: number = 3) {
    super()
    this.db = db
    this.maxConcurrent = maxConcurrent
    this.rateLimiter = new TokenBucket({ tokensPerSecond: 2, maxTokens: 5 })
    this.recoverInterruptedTasks()  // 启动时恢复未完成任务
  }

  // 崩溃恢复：将 running 状态的任务重置为 pending
  private recoverInterruptedTasks(): void {
    const interrupted = this.db.prepare(
      "UPDATE task_queue SET status = 'pending', retry_count = retry_count + 1 WHERE status = 'running'"
    ).run()
    if (interrupted.changes > 0) {
      logger.info(`Recovered ${interrupted.changes} interrupted tasks`)
    }
    this.process()
  }

  enqueue(task: Omit<GenerateTask, 'status' | 'progress' | 'retryCount' | 'maxRetries'>): string {
    const fullTask: GenerateTask = {
      ...task,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
    }
    // 持久化到 SQLite
    this.db.prepare(`
      INSERT INTO task_queue (id, type, node_id, model_id, params, status, progress)
      VALUES (?, ?, ?, ?, ?, 'pending', 0)
    `).run(fullTask.id, fullTask.type, fullTask.nodeId, fullTask.modelId,
          JSON.stringify(fullTask.params))

    this.emit('task:enqueued', fullTask)
    this.process()
    return fullTask.id
  }

  cancel(taskId: string): void {
    this.db.prepare("UPDATE task_queue SET status = 'cancelled' WHERE id = ?").run(taskId)
    this.running.delete(taskId)
    this.emit('task:cancelled', { taskId })
    this.process()
  }

  getTask(taskId: string): GenerateTask | undefined {
    const row = this.db.prepare('SELECT * FROM task_queue WHERE id = ?').get(taskId)
    return row ? this.rowToTask(row) : undefined
  }

  getAllTasks(filter?: { status?: string; nodeId?: string }): GenerateTask[] {
    // 支持按状态/节点筛选
    let sql = 'SELECT * FROM task_queue WHERE 1=1'
    const params: unknown[] = []
    if (filter?.status) { sql += ' AND status = ?'; params.push(filter.status) }
    if (filter?.nodeId) { sql += ' AND node_id = ?'; params.push(filter.nodeId) }
    sql += ' ORDER BY created_at DESC'
    return this.db.prepare(sql).all(...params).map(this.rowToTask)
  }

  private async process(): Promise<void> {
    while (this.running.size < this.maxConcurrent) {
      // 限流检查
      if (!this.rateLimiter.tryConsume()) break

      const row = this.db.prepare(
        "SELECT * FROM task_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
      ).get()
      if (!row) break

      const taskId = row.id
      this.running.add(taskId)
      this.db.prepare("UPDATE task_queue SET status = 'running', started_at = datetime('now') WHERE id = ?")
        .run(taskId)
      this.emit('task:start', this.rowToTask(row))
    }
  }

  complete(taskId: string, result: string): void {
    this.db.prepare(`
      UPDATE task_queue SET status = 'completed', result = ?, progress = 100, completed_at = datetime('now')
      WHERE id = ?
    `).run(result, taskId)
    this.running.delete(taskId)
    this.emit('task:complete', { taskId, result })
    this.process()
  }

  fail(taskId: string, error: string): void {
    const task = this.getTask(taskId)
    if (task && task.retryCount < task.maxRetries) {
      // 可重试：重置为 pending
      this.db.prepare(`
        UPDATE task_queue SET status = 'pending', error = ?, retry_count = retry_count + 1
        WHERE id = ?
      `).run(error, taskId)
      this.running.delete(taskId)
      this.emit('task:retry', { taskId, retryCount: task.retryCount + 1, error })
    } else {
      // 不可重试：标记失败
      this.db.prepare("UPDATE task_queue SET status = 'failed', error = ? WHERE id = ?")
        .run(error, taskId)
      this.running.delete(taskId)
      this.emit('task:fail', { taskId, error })
    }
    this.process()
  }

  updateProgress(taskId: string, progress: number): void {
    this.db.prepare('UPDATE task_queue SET progress = ? WHERE id = ?').run(progress, taskId)
    this.emit('task:progress', { taskId, progress })
  }

  private rowToTask(row: any): GenerateTask {
    return {
      id: row.id,
      type: row.type,
      nodeId: row.node_id,
      modelId: row.model_id,
      params: JSON.parse(row.params),
      status: row.status,
      result: row.result,
      error: row.error,
      progress: row.progress,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }
  }
}

// 令牌桶限流器
class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(private config: { tokensPerSecond: number; maxTokens: number }) {
    this.tokens = config.maxTokens
    this.lastRefill = Date.now()
  }

  tryConsume(): boolean {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.config.maxTokens, this.tokens + elapsed * this.config.tokensPerSecond)
    this.lastRefill = now
  }
}
```

---

## 五、ComfyUI 工作流模板

### flux_dev_api.json 模板结构

```json
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": "{{SEED}}",
      "steps": "{{STEPS}}",
      "cfg": "{{CFG}}",
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["10", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    }
  },
  "4": {
    "class_type": "UNETLoader",
    "inputs": {
      "model_name": "flux1-dev.safetensors",
      "weight_dtype": "fp8_e4m3fn"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": "{{WIDTH}}",
      "height": "{{HEIGHT}}",
      "batch_size": "{{BATCH_SIZE}}"
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "{{PROMPT}}",
      "clip": ["10", 1]
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "{{NEGATIVE_PROMPT}}",
      "clip": ["10", 1]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["3", 0],
      "vae": ["9", 0]
    }
  },
  "9": {
    "class_type": "VAELoader",
    "inputs": {
      "model_name": "ae.safetensors"
    }
  },
  "10": {
    "class_type": "DualCLIPLoader",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "flux"
    }
  },
  "11": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "LocalCanvas",
      "images": ["8", 0]
    }
  }
}
```

---

## 六、测试要点

| 测试场景 | 操作 | 预期结果 |
|----------|------|----------|
| 配置读取 | 启动应用 | 正确读取 config.yaml |
| 首次引导 | 删除 config.yaml 后启动 | 弹出引导界面 |
| ComfyUI 连接 | 点击测试连接 | 显示在线/离线状态 |
| 文生图 | 选择模型+输入提示词+生成 | 图片出现在节点中 |
| 图生视频 | 连线图片→视频节点+生成 | 视频出现在节点中 |
| 首尾帧视频 | 连线首帧+尾帧→视频生成 | 过渡视频生成 |
| 脚本生成 | 输入故事→生成脚本 | 分镜表格自动填充 |
| 批量分镜图 | 点击批量生成 | 自动创建图片节点 |
| 批量视频 | 点击批量生成 | 自动创建视频节点 |
| 生成进度 | 生成过程中观察 | 进度条实时更新 |
| 取消生成 | 生成中点击取消 | 任务被取消 |
| API 错误 | 关闭 ComfyUI 后生成 | 显示错误提示 |

---

## 七、v2 验收标准

- [ ] config.yaml 可配置模型（图像/视频/LLM）
- [ ] 首次启动有引导流程
- [ ] 配置面板可编辑模型+测试连接
- [ ] Utility Process 正常启动，模型 API 调用不阻塞主进程
- [ ] ComfyUI 适配器可完成文生图（在 Utility Process 中执行）
- [ ] ComfyUI 适配器可完成图生视频（在 Utility Process 中执行）
- [ ] OpenAI 兼容适配器可调用 LLM（在 Utility Process 中执行）
- [ ] TaskQueue 持久化到 SQLite，崩溃后可恢复未完成任务
- [ ] 适配器错误有分类（NetworkError/TimeoutError/ModelError）和友好提示
- [ ] 图像生成器面板完整可用
- [ ] 视频生成器面板完整可用
- [ ] 生成进度实时显示在节点内（Utility → Main → Renderer 链路）
- [ ] 脚本节点可 LLM 生成脚本
- [ ] 脚本节点可批量生成分镜图
- [ ] 脚本节点可批量生成视频
- [ ] 生成结果自动保存到本地
- [ ] Core 模块单元测试覆盖率 ≥ 80%

---

## 八、v2 → v3 衔接说明

v2 完成后，应用可以从零生成图片和视频，但无法剪辑和合成。v3 将引入 FFmpeg 集成和视频合成能力：

| v2 产出 | v3 扩展 |
|---------|---------|
| 单个视频片段 | 视频裁取/剪辑 |
| 多个独立视频 | 多视频拼接合成 |
| 无时间轴 | 时间轴编辑器 |
| 无导出 | MP4 导出 |
| 无音频混合 | 音频+视频混流 |
| 无项目管理 | 项目列表+资产面板完善 |

---

## 九、v2 架构修订补丁

> 以下为根据项目评审（P0/P1 问题）补充的修订项，开发时必须同步落地。

### 9.1 适配器错误类型定义

```typescript
// src/types/adapter-errors.ts — 适配器层统一错误类型

export class AdapterError extends Error {
  constructor(
    message: string,
    public adapterType: 'comfyui' | 'openai' | 'replicate' | 'custom',
    public code: AdapterErrorCode,
    public retryable: boolean,
    public userMessage: string,
    cause?: Error
  ) {
    super(message)
    Object.assign(this, { cause })
  }
}

export enum AdapterErrorCode {
  // 网络
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',     // 服务不可达
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',       // 连接超时（默认30s）
  NETWORK_ERROR = 'NETWORK_ERROR',                 // 其他网络错误

  // 模型
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',            // 模型ID不存在
  MODEL_LOADING = 'MODEL_LOADING',                 // 模型加载中
  MODEL_ERROR = 'MODEL_ERROR',                     // 模型运行时错误
  QUEUE_FULL = 'QUEUE_FULL',                        // 服务端队列满

  // 认证
  AUTH_FAILED = 'AUTH_FAILED',                     // API Key 无效
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',               // 配额耗尽

  // 输入
  INVALID_PARAMS = 'INVALID_PARAMS',               // 参数校验失败
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION', // 适配器不支持的操作

  // 未知
  UNKNOWN = 'UNKNOWN',
}

// 错误分类 → 用户提示映射
const USER_MESSAGES: Record<AdapterErrorCode, string> = {
  [AdapterErrorCode.CONNECTION_REFUSED]: '无法连接到模型服务，请检查地址是否正确',
  [AdapterErrorCode.CONNECTION_TIMEOUT]: '连接超时，请检查网络或增加超时时间',
  [AdapterErrorCode.NETWORK_ERROR]: '网络异常，请检查网络连接',
  [AdapterErrorCode.MODEL_NOT_FOUND]: '模型不存在，请检查模型ID',
  [AdapterErrorCode.MODEL_LOADING]: '模型加载中，请稍后重试',
  [AdapterErrorCode.MODEL_ERROR]: '模型运行出错，请调整参数后重试',
  [AdapterErrorCode.QUEUE_FULL]: '服务端队列已满，请稍后重试',
  [AdapterErrorCode.AUTH_FAILED]: '认证失败，请检查API Key',
  [AdapterErrorCode.QUOTA_EXCEEDED]: '配额已用尽，请更换Key或等待重置',
  [AdapterErrorCode.INVALID_PARAMS]: '参数校验失败，请检查输入',
  [AdapterErrorCode.UNSUPPORTED_OPERATION]: '当前适配器不支持此操作',
  [AdapterErrorCode.UNKNOWN]: '未知错误，请查看日志',
}
```

### 9.2 配置热重载机制

```typescript
// electron/utility/services/config-watcher.ts
// 监听 config.yaml 变化，自动刷新适配器实例

import { watch } from 'fs'
import { readConfig } from './config-service'
import { AdapterRegistry } from './adapter-registry'

export class ConfigWatcher {
  private adapters: AdapterRegistry
  private watcher: ReturnType<typeof watch> | null = null

  constructor(adapters: AdapterRegistry) {
    this.adapters = adapters
  }

  start(configPath: string): void {
    let debounceTimer: ReturnType<typeof setTimeout>
    this.watcher = watch(configPath, () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        try {
          const newConfig = readConfig(configPath)
          this.adapters.reloadFromConfig(newConfig)
          logger.info('Config reloaded successfully')
        } catch (err) {
          logger.error('Config reload failed', err)
        }
      }, 1000) // 1s debounce
    })
  }

  stop(): void {
    this.watcher?.close()
  }
}
```

### 9.3 适配器接口补充（v2→v4 统一）

```typescript
// src/types/adapter.ts — 适配器统一接口，v2/v3/v4 全版本使用

export interface ModelAdapter {
  readonly type: AdapterType
  readonly id: string

  // 生命周期
  initialize(): Promise<void>
  destroy(): Promise<void>
  healthCheck(): Promise<AdapterHealth>

  // 生成操作（返回 EventEmitter 用于进度推送）
  generateImage(params: ImageGenParams): EventEmitter
  generateVideo(params: VideoGenParams): EventEmitter
  generateText(params: TextGenParams): Promise<string>

  // 任务管理
  cancel(taskId: string): Promise<void>
  getStatus(): AdapterStatus

  // 能力声明（v2 新增，v4 扩展）
  capabilities(): AdapterCapabilities
}

export interface AdapterCapabilities {
  imageGeneration: boolean
  videoGeneration: boolean
  textGeneration: boolean
  maxResolution?: string          // '1024x1024'
  maxDuration?: number             // 视频最大秒数
  supportedModels?: string[]       // 可用模型列表
  supportsProgressUpdate: boolean // 是否支持进度推送
  supportsSSE: boolean            // 是否支持流式输出
  maxConcurrentTasks: number      // 最大并发任务数
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'down'
  latencyMs?: number
  message?: string
}
```

### 9.4 Utility Process 入口文件

```typescript
// electron/utility/index.ts — Utility Process 入口

import { MessagePortMain } from 'electron'
import { TaskQueue } from './services/task-queue'
import { AdapterRegistry } from './services/adapter-registry'
import { ConfigWatcher } from './services/config-watcher'
import Database from 'better-sqlite3'
import log from 'electron-log/renderer'

const logger = log.scope('utility')

// 初始化数据库
const db = new Database('localcanvas.db')
db.pragma('journal_mode = WAL')

// 初始化适配器注册表
const adapters = new AdapterRegistry()
const taskQueue = new TaskQueue(db, 3)

// 初始化配置热重载
const configWatcher = new ConfigWatcher(adapters)
configWatcher.start('config.yaml')

// MessagePort 通信
process.parentPort.on('message', (event) => {
  const { channel, data, port } = event.data

  switch (channel) {
    case 'model:generateImage': {
      const emitter = adapters.getAdapter(data.modelId).generateImage(data.params)
      emitter.on('progress', (p) => port.postMessage({ channel: 'model:progress', data: p }))
      emitter.on('complete', (r) => port.postMessage({ channel: 'model:complete', data: r }))
      emitter.on('error', (e) => port.postMessage({ channel: 'model:error', data: e }))
      break
    }
    case 'model:cancel':
      adapters.getAdapter(data.modelId).cancel(data.taskId)
      break
    // ... 其他通道
  }
})

logger.info('Utility Process started')
```

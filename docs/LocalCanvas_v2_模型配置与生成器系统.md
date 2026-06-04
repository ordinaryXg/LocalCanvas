# LocalCanvas v2 — 模型配置 + 生成器系统

> **版本目标**：接入远端模型 API，实现文本/图像/视频/音频生成全链路，画布从「可交互」变为「可产出」  
> **预计周期**：2.5 周（12 个工作日）  
> **前置条件**：v1 验收通过  
> **生成日期**：2026-06-04  
> **最后更新**：2026-06-04  
> **架构原则**：**所有生成能力均通过远端 HTTP API 调用**；**视频生成以 Doubao Seedance 2.0（火山方舟）为核心引擎**，与 libtv 主打模型一致。

---

## 实现进度概览

| 模块 | 状态 | 关键文件 |
|------|------|----------|
| config.yaml 读写 + 环境变量 | ✅ 已完成 | `electron/main/services/config.ts` |
| 首次引导（LLM + ARK Key） | ✅ 已完成 | `src/components/panels/OnboardingGuide.tsx` |
| 模型配置 UI | ✅ 已完成 | `src/components/panels/SettingsPanel.tsx` |
| Utility Process + TaskQueue | ✅ 已完成 | `electron/utility/index.ts` |
| RemoteApiAdapter（LLM/图/TTS） | ✅ 已完成 | `electron/utility/services/model-adapter/remote-api.ts` |
| **SeedanceAdapter（视频核心）** | ✅ 已完成 | `electron/utility/services/model-adapter/seedance.ts` |
| 生成器面板（文本/图像/视频） | ✅ 已完成 | `src/components/panels/GeneratorPanel.tsx` |
| 适配器错误分类 | ✅ 已完成 | `src/types/adapter-errors.ts` |
| 脚本节点 LLM 生成 | ✅ 已完成 | `electron/utility/services/script-generator.ts` |
| 批量分镜图 / 批量视频 | ✅ 已完成 | `electron/utility/services/batch-generator.ts` |
| 配置热重载 | ✅ 已完成 | `electron/utility/services/config-watcher.ts` |
| 设置面板「添加模型」表单 | ✅ 已完成 | `SettingsPanel.tsx` |
| TTS 配置 Tab + 音频生成器 | ✅ 已完成 | `SettingsPanel.tsx` / `AudioGenerator.tsx` |
| 生成器取消按钮 | ✅ 已完成 | `useModelGeneration.ts` |

---

## 一、版本功能清单

| # | 功能模块 | 子功能 | 优先级 | 状态 |
|---|----------|--------|--------|------|
| 1 | 配置系统 | config.yaml 解析/读写 | P0 | ✅ |
| 2 | 配置系统 | 首次引导流程（LLM + ARK API Key） | P0 | ✅ |
| 3 | 配置系统 | 模型配置 UI 面板 | P0 | ✅ |
| 4 | 配置系统 | 连通性测试 | P1 | ✅ |
| 4b | 配置系统 | TTS 模型配置 Tab + 默认 TTS | P0 | ✅ |
| 5 | 适配器 | ModelAdapter 基类 | P0 | ✅ |
| 6 | 适配器 | RemoteApiAdapter（OpenAI 兼容） | P0 | ✅ |
| 7 | 适配器 | **SeedanceAdapter（Doubao Seedance 2.0）** | P0 | ✅ |
| 8 | 适配器 | AdapterRegistry 工厂 | P0 | ✅ |
| 9 | 生成器 | 生成器面板框架 | P0 | ✅ |
| 10 | 生成器 | 图像生成器面板 | P0 | ✅ |
| 11 | 生成器 | **视频生成器面板（Seedance 核心）** | P0 | ✅ |
| 12 | 生成器 | 文本生成 + TTS 音频生成（音频节点面板） | P0 | ✅ |
| 13 | 生成器 | 生成进度（轮询 + IPC 推送） | P0 | ✅ |
| 14 | 生成器 | 生成结果下载与本地保存 | P0 | ✅ |
| 15 | 生成器 | 取消生成（队列标记 + 轮询中断；Seedance 远端任务可能仍在计费） | P1 | ✅ |
| 16 | 脚本节点 | LLM 脚本生成 | P0 | ✅ |
| 17 | 脚本节点 | 批量分镜图生成 | P0 | ✅ |
| 18 | 脚本节点 | 批量视频生成（Seedance） | P0 | ✅ |
| 19 | 生成队列 | SQLite 持久化 + 并发控制 | P1 | ✅ |

---

## 二、技术架构

> **关键约束**：模型 API 调用必须在 **Utility Process** 中执行，不可在主进程中阻塞窗口消息循环。

```
┌───────────────────────────────────────────────────────────────┐
│ Main Process（IPC 路由 + 数据库）                              │
│ ├── config:read / write / testConnection / needsOnboarding    │
│ ├── model:generateImage|Video|Text|Audio → UtilityClient      │
│ └── model:progress|complete|error → webContents.send           │
│                                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Utility Process（electron/utility/index.ts）                 ││
│ │ ├── AdapterRegistry                                          ││
│ │ │   ├── RemoteApiAdapter  → LLM / 图像 / TTS                 ││
│ │ │   └── SeedanceAdapter   → 视频（核心）                      ││
│ │ └── TaskQueue（SQLite task_queue 表，max_concurrent_tasks）  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ Renderer Process                                               │
│ ├── GeneratorPanel   选中 text/image/video 节点时底部弹出      │
│ ├── SettingsPanel    模型配置（⚙️ 模型配置）                    │
│ ├── OnboardingGuide  首次 API Key 引导                         │
│ └── 节点内嵌进度条（ImageNode isGenerating / progress）        │
└───────────────────────────────────────────────────────────────┘

进程间通信：
  Renderer ←→ Main     ipcRenderer.invoke / ipcMain.handle
  Main     ←→ Utility  utilityProcess.fork + postMessage
  Utility  → Main      → Renderer  model:progress / complete / error
```

### 代码目录（v2 新增/变更）

```
electron/
├── main/
│   ├── ipc/
│   │   ├── config.ts          # config:* IPC
│   │   └── model.ts           # model:* IPC
│   └── services/
│       ├── config.ts          # YAML 读写、testConnection
│       └── utility-client.ts  # Utility Process 生命周期 + 消息转发
└── utility/
    ├── index.ts               # Utility 入口
    └── services/
        ├── task-queue.ts
        └── model-adapter/
            ├── base.ts
            ├── remote-api.ts
            ├── seedance.ts    # ★ 视频核心
            └── factory.ts     # AdapterRegistry

src/
├── constants/
│   ├── seedance.ts            # Seedance API 常量、运镜映射
│   └── modelPresets.ts        # DeepSeek / GLM / Seedance 预设
├── types/
│   ├── config.ts
│   ├── adapter-errors.ts
│   └── ipc.ts
└── components/panels/
    ├── GeneratorPanel.tsx
    ├── ImageGenerator.tsx
    ├── VideoGenerator.tsx     # ★ Seedance 专用 UI
    ├── TextGenerator.tsx
    ├── AudioGenerator.tsx
    ├── ScriptGenerator.tsx
    ├── SettingsPanel.tsx
    └── OnboardingGuide.tsx
```

---

## 三、Doubao Seedance 2.0（视频核心）

> 官方文档：[Seedance 2.0 系列教程](https://www.volcengine.com/docs/82379/2291680?lang=zh) · [创建视频生成任务 API](https://www.volcengine.com/docs/82379/1520757?lang=zh)

### 3.1 API 端点

| 项目 | 值 |
|------|-----|
| Base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| 创建任务 | `POST /contents/generations/tasks` |
| 查询任务 | `GET /contents/generations/tasks/{task_id}` |
| 认证 | `Authorization: Bearer {ARK_API_KEY}` |
| 控制台 | [获取 API Key](https://console.volcengine.com/ark/region:ark+cn-beijing/apikey) |

### 3.2 模型 ID

| 模型 | ID | 用途 |
|------|-----|------|
| Seedance 2.0 标准版 | `doubao-seedance-2-0-260128` | 质量优先，默认 |
| Seedance 2.0 Fast | `doubao-seedance-2-0-fast-260128` | 速度优先，预览迭代 |

config 中对应 `seedance-2-0` / `seedance-2-0-fast` 两个条目。

### 3.3 任务生命周期

```
POST 创建任务 → 返回 { "id": "cgt-..." }
     ↓
GET 轮询 status: queued → running → succeeded | failed | expired | cancelled
     ↓
succeeded 时读取 content.video_url → 下载到 output_dir（24h 内有效）
```

典型耗时：5 秒 1080p 约 **60–120 秒**。

### 3.4 请求参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型 ID |
| `content` | array | 多模态输入，见下方 |
| `ratio` | string | `16:9` `9:16` `4:3` `3:4` `21:9` `1:1` `adaptive` |
| `resolution` | string | `480p` `720p` `1080p` `2K` |
| `duration` | int | 4–15 秒 |
| `generate_audio` | bool | 原生音画同步（对白/音效/BGM） |
| `watermark` | bool | 是否加水印，默认 false |

**content 数组格式：**

```json
// 文生视频
{ "type": "text", "text": "金色柴犬在麦田中奔跑，广角跟拍，电影感" }

// 图生视频（首帧）
{ "type": "image_url", "image_url": { "url": "https://..." } }

// 首尾帧（两张 image_url 按顺序：首帧 → 尾帧，自动 adaptive 比例）
```

LocalCanvas 实现：
- 运镜预设（静止/左移/推近等）→ 英文镜头描述追加到 `text`
- 画布连线首帧/尾帧 → `image_url`（支持 `file://` 转 base64 data URL）
- 有首尾帧时强制 `ratio: adaptive`

### 3.5 文生视频示例

```bash
curl -X POST "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "doubao-seedance-2-0-260128",
    "content": [
      { "type": "text", "text": "A golden retriever running through a sunlit wheat field, wide tracking shot, cinematic" }
    ],
    "ratio": "16:9",
    "resolution": "1080p",
    "duration": 5,
    "generate_audio": true,
    "watermark": false
  }'
```

---

## 四、其他远端模型

| 类型 | 推荐提供商 | provider | 说明 |
|------|-----------|----------|------|
| **视频** | **Doubao Seedance 2.0** | `volcengine_seedance` | 见第三节 |
| LLM | DeepSeek、GLM-4、通义千问 | `openai_compatible` | `/v1/chat/completions` |
| 图像 | DALL-E 3 等 | `openai_compatible` | `/v1/images/generations` |
| TTS | CosyVoice 云端等 | `openai_compatible` | POST 返回音频流或 URL |

扩展其他视频 API：在 `video_models` 中使用 `openai_compatible` + `poll_endpoint`，由 `RemoteApiAdapter` 处理（非默认路径）。

---

## 五、config.yaml 配置规范

**路径**：`%APPDATA%/LocalCanvas/config.yaml`（Windows）  
**读写**：`electron/main/services/config.ts` → `readConfig()` / `writeConfig()`  
**环境变量**：`${VAR}` 读取时替换为 `process.env.VAR`

### 5.1 完整示例

```yaml
# %APPDATA%/LocalCanvas/config.yaml

llm_models:
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

image_models:
  - id: "dall-e-3"
    name: "DALL-E 3"
    provider: "openai_compatible"
    endpoint: "https://api.openai.com/v1/images/generations"
    api_key: "${OPENAI_API_KEY}"
    model: "dall-e-3"
    max_resolution: 1792
    supported_ratios: ["1:1", "16:9", "9:16"]

# ─── 视频模型（核心：Seedance 2.0，首次安装默认内置）───
video_models:
  - id: "seedance-2-0"
    name: "Doubao Seedance 2.0"
    provider: "volcengine_seedance"
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
    poll_endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}"
    api_key: "${ARK_API_KEY}"
    model: "doubao-seedance-2-0-260128"
    max_duration: 15
    supported_resolutions: ["480p", "720p", "1080p", "2K"]
    default_params:
      ratio: "16:9"
      resolution: "1080p"
      generate_audio: true
      watermark: false

  - id: "seedance-2-0-fast"
    name: "Doubao Seedance 2.0 Fast"
    provider: "volcengine_seedance"
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
    poll_endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}"
    api_key: "${ARK_API_KEY}"
    model: "doubao-seedance-2-0-fast-260128"
    max_duration: 15
    default_params:
      ratio: "16:9"
      resolution: "720p"
      generate_audio: true

tts_models:
  - id: "cosyvoice-cloud"
    name: "CosyVoice（云端）"
    provider: "openai_compatible"
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2speech/synthesis"
    api_key: "${DASHSCOPE_API_KEY}"
    model: "cosyvoice-v1"

settings:
  default_llm: "deepseek"
  default_image_model: "dall-e-3"
  default_video_model: "seedance-2-0"
  default_tts: "cosyvoice-cloud"
  output_dir: "~/LocalCanvas/outputs"
  temp_dir: "~/LocalCanvas/.temp"
  max_concurrent_tasks: 3
  auto_save_interval: 30
  ffmpeg_path: ""
  onboarding_completed: false
```

### 5.2 类型定义

**文件**：`src/types/config.ts`

```typescript
export type ModelProvider = 'openai_compatible' | 'volcengine_seedance' | 'custom'

export interface VideoModelConfig {
  id: string
  name: string
  provider: ModelProvider          // 视频默认 volcengine_seedance
  endpoint: string                 // Seedance 创建任务 URL
  poll_endpoint?: string           // 含 {task_id} 占位符
  api_key?: string
  model: string                    // doubao-seedance-2-0-260128
  max_duration?: number
  supported_resolutions?: string[]
  default_params?: Record<string, unknown>  // ratio / resolution / generate_audio
}
```

预设常量：`src/constants/seedance.ts`、`src/constants/modelPresets.ts`

---

## 六、IPC 接口

### 6.1 配置

| Channel | 说明 |
|---------|------|
| `config:read` | 读取 AppConfig（含 env 替换） |
| `config:write` | 写入并触发 Utility 热重载 |
| `config:testConnection` | `(provider, endpoint, apiKey?)` |
| `config:exists` | config 文件是否存在 |
| `config:needsOnboarding` | 是否需要首次引导 |

### 6.2 生成

| Channel | 说明 |
|---------|------|
| `model:generateImage` | 图像生成 → TaskQueue |
| `model:generateVideo` | **Seedance 视频生成**（含 ratio/resolution/generateAudio） |
| `model:generateText` | LLM 文本生成 |
| `model:generateAudio` | TTS 音频生成 |
| `model:cancel` | 取消任务 |

### 6.3 事件（Main → Renderer）

| Channel |  payload |
|---------|----------|
| `model:progress` | `{ taskId, nodeId, percentage }` |
| `model:complete` | `{ taskId, nodeId, result }` — result 为本地文件路径 |
| `model:error` | `{ taskId?, nodeId?, error }` |

**GenerateVideoRequest**（Renderer → Main）：

```typescript
{
  modelId: string       // 如 "seedance-2-0"
  nodeId: string
  prompt: string
  duration: number      // 4–15
  ratio?: string        // "16:9" | "9:16" | ...
  resolution?: string   // "1080p" | ...
  generateAudio?: boolean
  firstFrame?: string   // 首帧 imageSrc
  lastFrame?: string    // 尾帧 imageSrc
  camera?: string       // 运镜预设（中文）
}
```

---

## 七、生成器面板

选中 **text / image / video / audio / script** 节点时，画布底部弹出 `GeneratorPanel`。

| 组件 | 文件 | 能力 |
|------|------|------|
| 框架 | `GeneratorPanel.tsx` | 按节点类型切换子面板 |
| 视频 ★ | `VideoGenerator.tsx` | Seedance：比例/分辨率/时长/运镜/原生音频/首尾帧预览 |
| 图像 | `ImageGenerator.tsx` | 提示词、模型、比例、批量 |
| 文本 | `TextGenerator.tsx` | 提示词、系统提示、LLM 选择 |
| 音频 | `AudioGenerator.tsx` | TTS 文本、音色、模型选择（`model:generateAudio`） |
| 脚本 | `ScriptGenerator.tsx` | 故事梗概、生成脚本、批量分镜图/视频 |

**VideoGenerator 默认行为：**
- 默认选中 `settings.default_video_model`（`seedance-2-0`）
- 未配置 ARK Key 时显示警告
- 按钮文案：`✨ Seedance 生成视频`

---

## 八、首次引导

`OnboardingGuide.tsx` 两步流程：

1. **欢迎页** — 介绍 Seedance 2.0 为核心视频引擎  
2. **API Key 配置**  
   - LLM：DeepSeek / GLM-4 / 通义千问（必选）  
   - 视频：火山方舟 **ARK API Key**（推荐，写入 Seedance 模型条目）

触发条件：`needsOnboarding()` — 未完成引导且无 LLM 配置。

---

## 九、脚本与批量生成（Day 9–12）✅

### 9.1 脚本节点 — `script-generator.ts`

路径：`electron/utility/services/script-generator.ts` + `src/utils/scriptGenerator.ts`

使用已配置 LLM，system prompt 约束 JSON 分镜格式：

```json
{
  "title": "脚本标题",
  "rows": [
    { "sequence": 1, "description": "...", "prompt": "...", "duration": 5, "camera": "静止" }
  ]
}
```

IPC：`model:generateScript` → ScriptNode「🤖 生成脚本」按钮

### 9.2 批量生成 — `batch-generator.ts`

路径：`electron/utility/services/batch-generator.ts`

- `model:batchGenerateImages` — 并发图像 API，自动创建图片节点并连线
- `model:batchGenerateVideos` — **并发 Seedance**，使用分镜 `prompt` + `duration` + `camera` + 首帧图

ScriptNode 按钮：「生成分镜图」「Seedance 视频」

### 9.3 配置热重载 — `config-watcher.ts`

路径：`electron/utility/services/config-watcher.ts`

监听 `config.yaml` 变化 → debounce 1s → `AdapterRegistry.reloadFromConfig()` + 更新 TaskQueue 并发数

`config:write` 仍通过 IPC 主动触发 `config:reload`。

---

## 十、测试要点

| 场景 | 操作 | 预期 |
|------|------|------|
| 配置读取 | 启动应用 | 读取 config.yaml，默认含 Seedance 视频模型 |
| 首次引导 | 删除 config 后启动 | 弹出 LLM + ARK Key 引导 |
| Seedance 连接 | 测试 ARK Key | 「Seedance API 连接成功」 |
| 文生视频 | 输入描述 → Seedance 生成 | 60–120s 后视频出现在节点 |
| 图生视频 | 图片节点 → 首帧连线 → 生成 | I2V 视频 |
| 首尾帧 | 首帧+尾帧连线 → 生成 | adaptive 比例过渡 |
| 原生音频 | 勾选「生成同步音频」 | 视频含音轨 |
| 运镜 | 选择「推近/环绕」等 | prompt 追加英文镜头描述 |
| 文生文/图 | LLM / DALL-E | 文本/图像写入节点 |
| 进度条 | 生成中观察 | 底部面板 + 节点内进度更新 |
| 错误 Key | 错误 ARK Key 后生成 | 友好错误提示（AUTH_FAILED） |

---

## 十一、v2 验收标准

- [x] config.yaml 可配置 LLM / 图像 / 视频 / TTS 远端模型
- [x] 默认内置 Seedance 2.0 + Fast 视频模型条目
- [x] 首次启动 API Key 引导（LLM + ARK Key）
- [x] 配置面板可查看模型 + 测试连接
- [x] Utility Process 启动，API 不阻塞主进程
- [x] RemoteApiAdapter：文本 / 图像 / TTS
- [x] **SeedanceAdapter：文生视频 / 图生视频 / 首尾帧 / 原生音频 / 运镜**
- [x] TaskQueue SQLite 持久化 + 崩溃恢复
- [x] 适配器错误分类（`AdapterErrorCode`）
- [x] 图像/视频/文本生成器面板可用
- [x] 生成进度 Utility → Main → Renderer
- [x] 生成结果保存到 `settings.output_dir`
- [x] 脚本节点 LLM 生成脚本
- [x] 批量分镜图 + 批量 Seedance 视频
- [x] 配置热重载
- [x] 设置面板「添加模型」表单

---

## 十二、v2 → v3 衔接

| v2 产出 | v3 扩展 |
|---------|---------|
| Seedance 单片段视频 | 视频裁取/剪辑 |
| 多个独立视频 | 多视频拼接合成 |
| 无时间轴 | 时间轴编辑器 |
| 无导出 | MP4 导出 |
| 无音频混合 | 音频+视频混流 |

---

## 十三、明确不支持（v2 范围外）

| 能力 | 说明 |
|------|------|
| 本地 ComfyUI / 自托管推理 | 不在 v2 范围 |
| 本地 SD / FLUX 推理 | 请使用对应云端 API |
| WebSocket 本地进度 | 仅远端 API 轮询 |

---

## 参考链接

- [Seedance 2.0 系列教程](https://www.volcengine.com/docs/82379/2291680?lang=zh)
- [创建视频生成任务 API](https://www.volcengine.com/docs/82379/1520757?lang=zh)
- [火山方舟 API Key 控制台](https://console.volcengine.com/ark/region:ark+cn-beijing/apikey)

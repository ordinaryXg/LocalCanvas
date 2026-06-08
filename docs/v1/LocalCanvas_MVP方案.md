# LocalCanvas — 本地 AI 视频创作画布 MVP 方案

> **基于**：LibTV 使用指南拆解的 PRD  
> **定位**：去云端化、模型可配置、本地运行的 AI 视频创作桌面应用  
> **版本**：v1.0 MVP  
> **日期**：2026-06-04

---

## 一、产品定义

| 项目 | 内容 |
|------|------|
| 产品名 | LocalCanvas（暂定） |
| 产品定位 | 本地化 AI 视频创作画布工具，聚焦「视频生成流程 + 画布操作」 |
| 产品形态 | Electron 桌面应用（Windows / macOS） |
| 核心差异 | 无需登录、模型自行配置、数据完全本地、无限画布节点式创作 |
| 灵感来源 | LibTV 的无限画布 + 节点工作流 + 视频生成流程 |

### 1.1 与 LibTV 的关键差异

| 维度 | LibTV（云端 SaaS） | LocalCanvas（本地桌面） |
|------|---------------------|------------------------|
| 账号 | 必须登录 | 无需登录，本地启动即用 |
| 模型 | 平台内置，按积分消耗 | 用户自行配置 API 端点（OpenAI 兼容/Seedance/Replicate/自定义 HTTP） |
| 存储 | 云端存储 | 本地 SQLite + 文件系统（JSON 仅用于导入/导出） |
| 积分/会员 | 有 | 无，用户直接对接模型服务商 |
| 社区/分享 | 有 | MVP 不含，V2 可选 |
| Agent 模式 | OpenClaw + Skill | V2 延后 |

---

## 二、MVP 核心功能

### 2.1 无限画布

**这是最核心的交互层，直接复用 LibTV 的画布设计理念。**

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 无限缩放 + 平移 | P0 | 鼠标滚轮缩放，空格+拖拽平移 |
| 小地图导航 | P1 | 左下角缩略图，拖拽快速定位 |
| 画布缩放显示 | P1 | 显示当前缩放百分比 |
| 深色/浅色主题 | P2 | 默认深色 |

### 2.2 五大节点类型

| 节点 | 图标 | MVP 功能 | 数据来源 |
|------|------|----------|----------|
| 文本节点 | T | 承载/编辑文本，支持手动输入 + LLM 生成 | 手动 / 调用 LLM API |
| 图片节点 | I | 承载单张图片，支持图像模型生成 | 本地上传 / 图像模型 API |
| 视频节点 | V | 承载单个视频，支持视频模型生成 | 本地上传 / 视频模型 API |
| 音频节点 | A | 承载单个音频 | 本地上传 / TTS API |
| 脚本节点 | S | 输入剧情/角色 → 生成脚本 → 批量分镜图 → 批量视频 | LLM + 图像/视频模型 |

#### 节点创建方式

| 方式 | 说明 |
|------|------|
| 双击空白处 | 弹出节点类型选择 |
| 拖入文件 | 直接拖入图片/视频/音频文件到画布 |
| 右键菜单 | 右键空白处 → 新建节点 → 选择类型 |
| 左侧栏 | 从左侧工具栏拖入节点 |

### 2.3 节点连线 & 工作流

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 节点连线 | P0 | 从节点端口拖拽连线到另一节点，传递数据 |
| 打组 | P0 | 框选多节点 → Ctrl+G 打组 |
| 工作流保存 | P1 | 对打组节点保存为可复用工作流模板 |
| 整组执行 | P1 | 修改参数后整组自动执行 |
| 撤销/重做 | P0 | Ctrl+Z / Ctrl+Shift+Z |

**连线规则（数据流方向）**：

```
文本节点 ──提示词──→ 图片节点 ──参考图──→ 视频节点
   │                    │                   │
   └──提示词──→ 视频节点  └──首尾帧──→ 视频节点
   
脚本节点 ──分镜脚本──→ 图片节点(批量) ──分镜图──→ 视频节点(批量)
   
音频节点 ───────────→ 视频合成节点(混合音轨)
```

### 2.4 图像生成器

节点选中后底部弹出生成器面板。

| 功能 | 说明 |
|------|------|
| 提示词输入 | 正向 + 反向提示词 |
| 模型选择 | 从 config.yaml 配置的模型列表选择 |
| 画幅比 | 1:1 / 16:9 / 9:16 / 21:9 等 |
| 参考图 | 支持从画布其他图片节点连线作为参考 |
| 生成数量 | 1-4 张 |
| 生成按钮 | 点击后调用配置的图像模型 API |

### 2.5 视频生成器

| 功能 | 说明 |
|------|------|
| 提示词输入 | 运镜描述 + 画面描述 |
| 模型选择 | 从配置列表选择 |
| 时长设置 | 3s / 5s / 10s |
| 首帧参考 | 从画布图片节点连线 |
| 尾帧参考 | 从画布图片节点连线（首尾帧模式） |
| 运镜控制 | 简化版：左移/右移/推/拉/环绕/静止 |

### 2.6 脚本节点（MVP 简化版）

这是 LibTV 最有价值的功能之一，MVP 中简化实现。

| 步骤 | 操作 | 说明 |
|------|------|------|
| Step 1 | 输入剧情描述 | 文本框输入故事梗概 |
| Step 2 | LLM 生成脚本 | 调用配置的 LLM，输出分镜表格 |
| Step 3 | 选择风格/模型 | 选择图像模型 + 风格 |
| Step 4 | 批量生成分镜图 | 自动为每个分镜生成图片 |
| Step 5 | 批量生成视频 | 将分镜图自动转为视频片段 |

**脚本表格字段（MVP）**：

| 字段 | 说明 |
|------|------|
| 序号 | 分镜编号 |
| 画面描述 | 文本描述 |
| 提示词 | 图像生成用提示词（LLM 自动生成） |
| 时长 | 视频时长 |
| 运镜 | 运镜方式 |

### 2.7 视频剪辑 & 合成

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 基础剪辑 | P1 | 裁取视频片段（入点/出点） |
| 多段拼接 | P1 | 多个视频节点连线 → 合成节点 → 顺序拼接 |
| 时间轴编辑 | P1 | 底部时间轴面板，拖拽调整顺序 |
| 音频混合 | P2 | 视频+音频连线，混入音轨 |
| 导出 | P0 | 合成后导出为 MP4 |

**MVP 合成方案**：使用 FFmpeg（Electron 主进程调用本地 FFmpeg 二进制），不做浏览器端合成。

---

## 三、模型配置系统

这是本产品与 LibTV 的核心差异点 —— 模型完全可配置。

### 3.1 配置文件格式

```yaml
# config.yaml — 模型配置文件
# 位于用户数据目录：~/.localcanvas/config.yaml

# 图像模型配置
image_models:
  - id: "seedream-4.5"
    name: "Seedream 4.5"
    provider: "openai_compatible"
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/images/generations"
    api_key: "${ARK_API_KEY}"
    model: "doubao-seedream-4-5-251128"
    max_resolution: 4096
    supported_ratios: ["1:1", "16:9", "9:16", "3:4", "4:3"]

  - id: "dall-e-3"
    name: "DALL-E 3"
    provider: "openai_compatible"
    endpoint: "https://api.openai.com/v1/images/generations"
    api_key: "sk-xxx"             # 支持环境变量引用 ${OPENAI_API_KEY}
    model: "dall-e-3"
    max_resolution: 1792

# 视频模型配置
video_models:
  - id: "seedance-2.0"
    name: "Seedance 2.0"
    provider: "volcengine_seedance"
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
    poll_endpoint: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}"
    api_key: "${ARK_API_KEY}"
    model: "doubao-seedance-2-0-260128"
    max_duration: 10
    supported_resolutions: ["720p", "1080p"]

  - id: "kling"
    name: "Kling"
    provider: "replicate"
    endpoint: "https://api.replicate.com/v1/predictions"
    api_key: "${REPLICATE_API_KEY}"
    model_version: "kling-v1"
    max_duration: 10

  - id: "custom-video"
    name: "自定义视频模型"
    provider: "custom"
    endpoint: "http://my-server:8080/generate"
    method: "POST"
    headers:
      Authorization: "Bearer ${CUSTOM_API_KEY}"
    request_template:
      prompt: "{{prompt}}"
      image: "{{reference_image_base64}}"
      duration: "{{duration}}"
    response_mapping:
      video_url: "$.data.video_url"
      status: "$.status"

# LLM 配置
llm_models:
  - id: "qwen3"
    name: "Qwen3"
    provider: "openai_compatible"
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    api_key: "${DASHSCOPE_API_KEY}"
    model: "qwen-max"

  - id: "deepseek"
    name: "DeepSeek"
    provider: "openai_compatible"
    endpoint: "https://api.deepseek.com/v1/chat/completions"
    api_key: "${DEEPSEEK_API_KEY}"
    model: "deepseek-chat"

# 音频/TTS 配置
tts_models:
  - id: "cosyvoice"
    name: "CosyVoice"
    provider: "custom"
    endpoint: "http://127.0.0.1:50000/tts"
    method: "POST"

# 通用设置
settings:
  default_image_model: "seedream-4.5"
  default_video_model: "seedance-2.0"
  default_llm: "qwen3"
  output_dir: "~/LocalCanvas/outputs"
  temp_dir: "~/LocalCanvas/.temp"
  max_concurrent_tasks: 3
```

### 3.2 适配器架构

```
ModelAdapter (抽象基类)
├── RemoteApiAdapter（OpenAI 兼容 HTTP）
│   ├── 统一 REST 调用（图像/文本/视频/音频）
│   ├── 异步任务轮询
│   └── 输出文件自动下载到本地
├── SeedanceAdapter（火山方舟视频）
│   ├── 创建任务 + 轮询状态
│   └── 视频输出自动下载
├── ReplicateAdapter
│   ├── 异步预测模式
│   └── 轮询进度 + 自动下载
└── CustomAdapter
    ├── 通用 HTTP 请求
    ├── 请求模板变量替换 {{var}}
    └── 响应 JSONPath 映射
```

### 3.3 远程 API 适配器设计（首要支持）

**为什么首要支持 OpenAI 兼容 HTTP API**：
- 火山方舟等云服务提供稳定的图像/视频/LLM 接口
- 无需本地 GPU，配置 API Key 即可使用
- 适配器层统一抽象，便于扩展 Replicate / 自定义端点

**交互流程**：

```
1. 用户在画布创建图片节点 → 输入提示词 → 点击生成
2. 应用读取 config.yaml 中对应模型的 endpoint 与 api_key
3. RemoteApiAdapter / SeedanceAdapter 构造 HTTP 请求
4. 填入用户参数（提示词/分辨率/参考图等）
5. POST 提交任务（同步返回或异步 task_id）
6. 轮询任务状态 → 节点显示进度条
7. 完成后下载输出文件 → 展示在节点中
8. 同时保存到本地 outputs/ 目录
```

---

## 四、数据存储设计

> **设计原则**：SQLite 为唯一数据源，JSON 仅作为导入/导出格式，杜绝 JSON+SQLite 混用导致的数据口径不一致。

### 4.1 项目文件结构

```
~/LocalCanvas/
├── localcanvas.db              # SQLite 主数据库（项目 + 生成历史 + 工作流）
├── config.yaml                 # 全局模型配置
├── assets/                     # 全局素材
│   ├── images/
│   ├── videos/
│   └── audios/
└── thumbnails/                 # 缩略图缓存
```

### 4.2 SQLite 表结构概览

```sql
-- 项目表：画布数据存储在 SQLite，不再使用 project.json
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  viewport TEXT,               -- JSON: { x, y, zoom }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 节点表
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'text' | 'image' | 'video' | 'audio' | 'script'
  position TEXT NOT NULL,       -- JSON: { x, y }
  size TEXT,                    -- JSON: { width, height }
  data TEXT NOT NULL,           -- JSON: NodeData（类型相关字段）
  ports TEXT,                   -- JSON: Port[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 连线表
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_port TEXT NOT NULL,
  target TEXT NOT NULL,
  target_port TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'prompt' | 'reference' | 'firstFrame' | 'lastFrame' | 'audio' | 'data'
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 分组表
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT,
  node_ids TEXT NOT NULL,       -- JSON: string[]
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### 4.3 数据访问层抽象

```typescript
// IRepository<T> 统一接口，所有数据操作通过 Repository 访问
interface IRepository<T> {
  getById(id: string): T | null
  getAll(filter?: Partial<T>): T[]
  create(item: Omit<T, 'id'>): string
  update(id: string, updates: Partial<T>): void
  delete(id: string): void
}

// 项目存取走 SQLite，JSON 仅做导入/导出
class ProjectRepository implements IRepository<Project> {
  // SQLite CRUD...
  exportToJSON(projectId: string): string  // 导出为 JSON
  importFromJSON(json: string): string      // 从 JSON 导入
}
```

### 4.4 核心数据类型

```typescript
interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: Node[];
  edges: Edge[];
  groups: Group[];
}

interface Node {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'script';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: NodeData;
  ports: Port[];
}

interface NodeData {
  // 文本节点
  content?: string;
  llmModel?: string;

  // 图片节点
  imageSrc?: string;         // 本地路径
  prompt?: string;
  negativePrompt?: string;
  modelId?: string;
  ratio?: string;
  referenceImageIds?: string[];

  // 视频节点
  videoSrc?: string;
  prompt?: string;
  modelId?: string;
  duration?: number;
  firstFrameId?: string;
  lastFrameId?: string;

  // 音频节点
  audioSrc?: string;

  // 脚本节点
  scriptContent?: ScriptRow[];
  imageModelId?: string;
  videoModelId?: string;
}

interface Edge {
  id: string;
  source: string;    // 源节点 ID
  sourcePort: string; // 源端口
  target: string;    // 目标节点 ID
  targetPort: string; // 目标端口
  type: 'prompt' | 'reference' | 'firstFrame' | 'lastFrame' | 'audio' | 'data';
}
```

---

## 五、技术选型

### 5.1 核心技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 桌面框架 | **Electron 33+** | 跨平台、React 生态、Node.js 原生能力 |
| 前端框架 | **React 19 + TypeScript** | 类型安全、组件生态丰富 |
| 画布引擎 | **React Flow 12** | 成熟的节点编辑器库，自带缩放/平移/连线/小地图 |
| 状态管理 | **Zustand** | 轻量、简洁、支持持久化中间件 |
| 样式 | **Tailwind CSS 4 + CSS Variables** | 原子化 CSS、设计令牌化、深色主题友好 |
| 图像处理 | **Konva.js** (可选) | Canvas 2D 渲染、图片标注等 |
| 视频处理 | **FFmpeg (Utility Process 调用)** | 本地视频剪辑/合成/转码，独立进程不阻塞主进程 |
| 数据库 | **better-sqlite3** | 嵌入式 SQLite、同步 API、高性能、唯一数据源 |
| 构建工具 | **Vite + electron-builder** | 快速开发、一键打包 |
| 测试框架 | **Vitest + Playwright** | 单元/组件测试 + E2E 测试 |
| 日志 | **electron-log** | 结构化日志、文件输出、主进程+渲染进程统一 |
| 国际化 | **i18next** | 成熟的 i18n 框架，MVP 预留接口 |

### 5.2 关键依赖

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@xyflow/react": "^12.0.0",
    "zustand": "^5.0.0",
    "better-sqlite3": "^11.0.0",
    "yaml": "^2.0.0",
    "axios": "^1.7.0",
    "ws": "^8.0.0",
    "uuid": "^10.0.0",
    "electron-log": "^5.0.0",
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.50.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

### 5.3 Electron 多进程架构

> **⚠️ 关键修正**：模型 API 调用和 FFmpeg 操作不可在主进程执行，否则会阻塞窗口消息循环。采用 Main + Utility Process + Renderer 三进程架构。

```
┌──────────────────────────────────────────────────────────────────┐
│ Main Process（轻量，仅窗口管理 + IPC 路由）                        │
│ ├── BrowserWindow 管理                                           │
│ ├── IPC Bridge（MessagePort 转发）                                │
│ ├── SQLite 数据库初始化                                           │
│ ├── 配置文件读取（config.yaml）                                   │
│ └── 应用生命周期（启动/退出/自动更新）                             │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Utility Process（CPU/IO 密集操作，独立进程不阻塞主进程）      │  │
│ │ ├── ModelAdapter 调用层                                     │  │
│ │ │   ├── RemoteApiAdapter / SeedanceAdapter（HTTP API）        │  │
│ │ │   ├── OpenAICompatibleAdapter（REST + SSE）               │  │
│ │ │   ├── ReplicateAdapter（异步轮询）                         │  │
│ │ │   └── CustomAdapter（模板 + JSONPath）                     │  │
│ │ ├── FFmpeg 子进程管理                                        │  │
│ │ ├── 生成任务队列（TaskQueue，持久化到 SQLite）                │  │
│ │ └── 文件下载/上传                                            │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Renderer Process (React)                                    │  │
│ │ ├── React Flow 画布                                         │  │
│ │ ├── 节点组件（文本/图片/视频/音频/脚本）                     │  │
│ │ ├── 生成器面板                                              │  │
│ │ ├── 视频时间轴编辑器                                        │  │
│ │ ├── 模型配置界面                                            │  │
│ │ └── 项目管理界面                                            │  │
│ └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

进程间通信：
- Renderer ↔ Main：ipcRenderer.invoke() / ipcMain.handle()
- Main ↔ Utility：MessagePort（双向、零序列化开销）
- Renderer ↔ Utility：通过 Main 转发（安全边界）
```

---

## 六、界面布局

```
┌──────────────────────────────────────────────────────────────┐
│  ◉◉◉  LocalCanvas    [项目名]                    ⚙ 设置   │
├────┬─────────────────────────────────────────────────────┬────┤
│    │                                                     │    │
│ +  │                                                     │    │
│ ─  │                                                     │    │
│    │              无 限 画 布 区                          │    │
│ 📝 │                                                     │    │
│ 🖼  │     ┌──────┐    ┌──────┐    ┌──────┐              │    │
│ 🎥 │     │文本   │───→│图片   │───→│视频   │              │    │
│ 🎵 │     │节点   │    │节点   │    │节点   │              │    │
│ 🎬 │     └──────┘    └──────┘    └──────┘              │    │
│    │                                                     │    │
│ ─  │                                                     │    │
│    │                                                     │    │
│ 🔧 │                                                     │    │
│ 📁 │                                                     │    │
│ 📜 │                                                     │    │
├────┴─────────────────────────────────────────────────────┴────┤
│  📍小地图   缩放: 100%  │  生成队列: 2/3  │  🎬视频合成    │
└──────────────────────────────────────────────────────────────┘
```

### 6.1 左侧栏

| 图标 | 功能 | MVP 内容 |
|------|------|----------|
| + | 添加节点 | 5种节点类型拖入 |
| 🔧 | 工具箱 | 已保存的工作流模板 |
| 📁 | 资产 | 本地上传的素材管理 |
| 📜 | 历史记录 | 所有生成记录，支持回用 |

### 6.2 节点交互

| 操作 | 方式 |
|------|------|
| 选中节点 | 单击 |
| 拖动节点 | 按住拖拽 |
| 创建连线 | 从端口拖出连线到另一端口 |
| 节点菜单 | 右键（复制/删除/打组/创建资产/创建工作流） |
| 生成器面板 | 选中节点后底部弹出 |
| 预览 | 双击节点 → 全屏预览 |

### 6.3 生成器面板（选中节点后底部弹出）

```
┌────────────────────────────────────────────────────────────────┐
│  🖼 图像生成器  │  模型: [FLUX.1 Dev ▾]  │  比例: [16:9 ▾]    │
│────────────────────────────────────────────────────────────────│
│  正向提示词:  [一位赛博朋克风格的女战士，霓虹灯光，雨夜街头...]  │
│  反向提示词:  [低质量, 模糊, 变形...]                          │
│  参考图:  [📷 节点#3]  [📷 节点#5]    生成数量: [1▾]          │
│                                                    [✨ 生成]   │
└────────────────────────────────────────────────────────────────┘
```

---

## 七、视频生成核心流程

### 7.1 流程一：文生图 → 图生视频（最常用）

```
1. 双击画布 → 新建文本节点 → 输入画面描述
2. 从文本节点拉线 → 新建图片节点（自动填入提示词）
3. 图片生成器选模型 → 点击生成 → 得到图片
4. 从图片节点拉线 → 新建视频节点（图片自动作为首帧参考）
5. 视频生成器输入运镜描述 → 选模型 → 点击生成
6. 得到视频片段
```

### 7.2 流程二：脚本 → 分镜 → 批量视频

```
1. 双击画布 → 新建脚本节点
2. 输入故事梗概 + 角色描述
3. 点击「生成脚本」→ LLM 输出分镜表格
4. 编辑/调整分镜表格内容
5. 点击「批量生成分镜图」→ 图像模型为每个分镜生成图片
6. 点击「批量生成视频」→ 视频模型将每张分镜图转为视频
7. 所有视频自动连线到合成节点
8. 打开合成时间轴 → 调整顺序 → 合成导出
```

### 7.3 流程三：首尾帧视频

```
1. 上传/生成起始帧图片
2. 上传/生成结束帧图片
3. 两张图片连线到视频节点（首帧+尾帧端口）
4. 输入过渡描述 → 选模型 → 生成过渡视频
```

### 7.4 流程四：视频合成导出

```
1. 将多个视频节点连线到合成节点
2. 点击合成节点 → 打开底部时间轴
3. 拖拽调整视频片段顺序
4. 可选：添加音频轨道
5. 点击「合成」→ FFmpeg 本地合成
6. 导出为 MP4
```

---

## 八、开发里程碑

> **设计原则**：每个 Phase 内功能拆分 **Core（必须完成）** 与 **Nice-to-have（可降级）**，确保核心路径不阻塞；Phase 间预留 20% 缓冲时间应对技术风险。

### Phase 1：画布基础 + 节点系统（2 周 + 2 天缓冲）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **Core** | Electron 项目脚手架 | Vite + React + TypeScript + Electron + 多进程架构 |
| **Core** | React Flow 集成 | 画布缩放/平移/小地图 |
| **Core** | 5 种节点组件 | 文本/图片/视频/音频/脚本 |
| **Core** | 节点连线 | 数据流连线，端口定义 |
| **Core** | 打组 & 撤销 | Ctrl+G 打组，Ctrl+Z 撤销 |
| **Core** | SQLite 数据库初始化 | 建表 + Repository 层 + 项目存取 |
| **Core** | 日志系统 | electron-log 集成，主进程 + 渲染进程统一输出 |
| **Core** | 错误处理框架 | ErrorHandler 统一异常捕获 + 用户友好提示 |
| Nice-to-have | 左侧栏 | 节点拖入 + 资产管理 + 历史记录 |
| Nice-to-have | i18n 基础 | i18next 初始化 + 中文 locale |
| Nice-to-have | Vitest 测试基础设施 | 单元测试 + 组件测试框架 |

### Phase 2：模型配置 + 生成器（2 周 + 3 天缓冲）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **Core** | config.yaml 解析 | 模型配置读取/写入 UI |
| **Core** | Utility Process 搭建 | 独立进程承载模型 API 调用 |
| **Core** | RemoteApi + Seedance 适配器 | HTTP API 调用 + 异步轮询（在 Utility Process） |
| **Core** | 图像生成器面板 | 提示词/模型/参数/生成 |
| **Core** | 视频生成器面板 | 提示词/模型/首尾帧/生成 |
| **Core** | 生成进度 | 节点内进度条显示（Utility → Main → Renderer） |
| Nice-to-have | LLM 调用 | OpenAI 兼容接口，文本生成 |
| Nice-to-have | 脚本节点 | LLM 生成脚本 + 批量分镜 + 批量视频 |
| Nice-to-have | 配置热重载 | config.yaml 修改后自动刷新适配器 |

### Phase 3：视频合成 + 打磨（2 周 + 3 天缓冲）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **Core** | FFmpeg 集成 | Utility Process 调用本地 FFmpeg（跨平台路径检测） |
| **Core** | 视频基础剪辑 | 入点/出点裁取 |
| **Core** | 视频合成 | 多片段拼接 + 时间轴（编码一致性检测） |
| **Core** | 导出功能 | MP4 导出 |
| **Core** | OpenAI 兼容适配器 | REST API 调用（在 Utility Process） |
| Nice-to-have | 项目管理界面 | 项目列表/新建/删除 |
| Nice-to-have | 深色主题 | 设计令牌化 + CSS Variables |
| Nice-to-have | E2E 测试 | Playwright 集成 |

### Phase 4：完善 + 发布（1.5 周 + 2 天缓冲）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **Core** | 自定义适配器 | config.yaml 自定义端点支持（在 Utility Process） |
| **Core** | 生成历史 | SQLite 记录所有生成任务 |
| **Core** | 错误处理完善 | API 失败/超时/重试/离线检测 |
| **Core** | 打包发布 | electron-builder，Windows/macOS 安装包 |
| Nice-to-have | 工作流模板 | 保存/加载/复用 |
| Nice-to-have | 使用文档 | README + 快速入门指南 |
| Nice-to-have | 自动更新 | electron-updater 集成 |

**总计：约 8 周（含缓冲），Core 路径约 6 周**

---

## 九、技术风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| React Flow 性能（节点过多） | 画布卡顿 | 虚拟化渲染，节点数 >100 时启用 viewport culling |
| 各家 API 格式差异 | 不同服务商请求/响应结构不同 | Adapter 层抽象 + custom_config 配置化映射 |
| FFmpeg 体积大 | 安装包臃肿 | 首次启动时下载，不打包进安装包 |
| 大文件本地存储 | 视频/图片占用磁盘 | 缩略图 + 原始文件分离，支持外部存储路径 |
| 模型 API 不统一 | 各家 API 格式差异 | Adapter 层抽象，配置化映射 |
| **主进程阻塞** | 模型 API / FFmpeg 在主进程执行导致窗口卡顿 | **已修正**：Utility Process 独立进程，MessagePort 通信 |
| **数据层不一致** | JSON + SQLite 混用导致数据口径分裂 | **已修正**：SQLite 为唯一数据源，IRepository 统一抽象，JSON 仅导入导出 |
| **缺少测试覆盖** | 回归 bug 频发，重构无信心 | MVP 阶段 Core 模块 Vitest 单元测试 80%+ 覆盖率目标 |
| **崩溃数据丢失** | 异常退出时未保存的画布数据丢失 | SQLite WAL 模式 + 自动保存（30s）+ 崩溃恢复检测 |
| **跨平台 FFmpeg 路径** | Windows/macOS/Linux 路径差异 | 启动时自动检测，支持用户手动指定，`@ffmpeg-installer/ffmpeg` 降级方案 |
| **版本强依赖链** | v1→v4 串行依赖，任一 Phase 延误全链延误 | Core/Nice-to-have 分层，Core 路径可独立验收 |

---

## 十、MVP 完成标准

以下功能全部可用即视为 MVP 完成：

- [ ] 能创建/保存/打开项目（SQLite 存储）
- [ ] 画布支持无限缩放/平移/小地图
- [ ] 5 种节点可创建、编辑、删除
- [ ] 节点之间可连线（数据流正确传递）
- [ ] 图片生成器可通过远程 API 生成图片（Utility Process 调用）
- [ ] 视频生成器可通过 Seedance / 远程 API 生成视频（Utility Process 调用）
- [ ] 脚本节点可 LLM 生成脚本 → 批量分镜 → 批量视频
- [ ] 多视频可连线到合成节点，通过 FFmpeg 合成导出（Utility Process 调用）
- [ ] config.yaml 可配置模型端点
- [ ] 所有生成结果保存在本地（SQLite + 文件系统）
- [ ] Windows 可安装运行
- [ ] 日志系统正常工作（electron-log 输出到文件）
- [ ] 错误处理框架正常（统一异常捕获 + 用户友好提示）
- [ ] Core 模块单元测试覆盖率 ≥ 80%

---

## 附录 A：画布工作流模板示例

LocalCanvas 的「工作流」指画布节点编排模板（非外部推理引擎工作流），存储于 SQLite `workflows` 表，例如：

- **文生图 → 图生视频**：文本节点 → 图片节点 → 视频节点
- **首尾帧视频生成**：双文本 → 双图片 → 视频节点
- **多片段合成导出**：多视频 + 音频 → 合成节点

用户可在侧边栏「工具」加载预置模板，或将打组节点右键保存为自定义工作流。

---

## 附录 B：快捷键设计

### 画布操作

| 操作 | Windows | Mac |
|------|---------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
| 框选 | 鼠标拖拽空白处 | 鼠标拖拽空白处 |
| 平移画布 | 空格+拖拽 / 中键拖拽 | 空格+拖拽 / 中键拖拽 |
| 缩放 | 滚轮 | 滚轮 |
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Shift+Z | Cmd+Shift+Z |
| 打组 | Ctrl+G | Cmd+G |
| 删除 | Delete | Delete |
| 复制 | Ctrl+C | Cmd+C |
| 粘贴 | Ctrl+V | Cmd+V |
| 全选 | Ctrl+A | Cmd+A |

### 视频时间轴

| 操作 | Windows | Mac |
|------|---------|-----|
| 播放/暂停 | Space | Space |
| 逐帧 | ← / → | ← / → |
| 设置入点 | I | I |
| 设置出点 | O | O |

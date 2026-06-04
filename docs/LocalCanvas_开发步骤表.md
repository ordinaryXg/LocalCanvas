# LocalCanvas MVP 开发步骤表

> **基于**：LocalCanvas_MVP方案.md  
> **技术栈**：Electron 33+ / React 19 / React Flow 12 / Zustand / Tailwind CSS 4 / FFmpeg / better-sqlite3  
> **总周期**：7 周（Phase 1-4）  
> **生成日期**：2026-06-04

---

## 全局依赖安装

> 在开始任何 Phase 之前，先完成项目脚手架搭建。

| 步骤 | 命令 / 操作 | 说明 |
|------|-------------|------|
| G-1 | `npm create vite@latest localcanvas -- --template react-ts` | 创建 Vite + React + TypeScript 项目 |
| G-2 | `cd localcanvas && npm install electron@33 electron-builder @electron-toolkit/preload` | 安装 Electron |
| G-3 | `npm install @xyflow/react@12 zustand@5 tailwindcss@4` | 安装核心前端依赖 |
| G-4 | `npm install better-sqlite3@11 yaml@2 axios@1 ws@8 uuid@10` | 安装后端/工具依赖 |
| G-5 | `npm install -D @types/better-sqlite3 @types/ws electron-vite` | 安装开发依赖 |
| G-6 | 配置 `electron.vite.config.ts`，设置 main/preload/renderer 入口 | Electron + Vite 联调 |
| G-7 | 配置 `tailwind.config.ts` + 深色主题 CSS 变量 | 主题系统 |
| G-8 | 初始化目录结构（见下方） | 项目骨架 |

### 初始目录结构

```
localcanvas/
├── electron/
│   ├── main/
│   │   ├── index.ts              # 主进程入口
│   │   ├── ipc/                   # IPC Handler
│   │   ├── services/              # 后端服务
│   │   │   ├── project.ts         # 项目文件读写
│   │   │   ├── model-adapter/     # 模型适配器
│   │   │   │   ├── base.ts
│   │   │   │   ├── comfyui.ts
│   │   │   │   ├── openai-compat.ts
│   │   │   │   ├── replicate.ts
│   │   │   │   └── custom.ts
│   │   │   ├── ffmpeg.ts          # FFmpeg 调用
│   │   │   └── config.ts          # config.yaml 读写
│   │   └── database/
│   │       └── index.ts           # SQLite 初始化
│   └── preload/
│       └── index.ts               # preload 脚本
├── src/
│   ├── main.tsx                   # React 入口
│   ├── App.tsx                    # 根组件
│   ├── components/
│   │   ├── canvas/                # 画布相关
│   │   ├── nodes/                 # 节点组件
│   │   ├── panels/                # 生成器/设置面板
│   │   ├── sidebar/               # 左侧栏
│   │   └── common/                # 通用组件
│   ├── stores/                    # Zustand stores
│   ├── hooks/                     # 自定义 hooks
│   ├── types/                     # TypeScript 类型定义
│   ├── utils/                     # 工具函数
│   └── styles/                    # 样式
├── resources/                     # 静态资源
│   └── workflows/                 # 预置 ComfyUI 工作流
├── package.json
├── electron.vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Phase 1：画布基础 + 节点系统（第 1-2 周）

### 1.1 Electron 窗口与主进程

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 1.1.1 | 主进程窗口创建 | 1. 编写 `electron/main/index.ts`，创建 BrowserWindow<br>2. 加载 renderer 的 dev URL 或 build 产物<br>3. 配置窗口属性（标题、尺寸 1280×800、最小尺寸 1024×600、frameless 可选） | `new BrowserWindow({ webPreferences: { preload, contextIsolation: true } })` | 应用启动后显示空白窗口 |
| 1.1.2 | IPC Bridge 搭建 | 1. 定义 IPC channel 常量（`project:load`、`project:save`、`model:generate` 等）<br>2. 编写 preload 暴露 `window.api` 对象<br>3. 主进程注册 `ipcMain.handle()` | `contextBridge.exposeInMainWorld('api', {...})` | 渲染进程可通过 `window.api.xxx()` 调用主进程方法 |
| 1.1.3 | 应用生命周期 | 1. 处理 `app.on('window-all-closed')`<br>2. 处理 `app.on('activate')`（macOS）<br>3. 窗口关闭前检查未保存变更 | — | 窗口关闭/重开行为正常 |

### 1.2 React Flow 画布集成

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 1.2.1 | 基础画布组件 | 1. 安装 `@xyflow/react`<br>2. 创建 `<Canvas>` 组件包裹 `<ReactFlow>`<br>3. 配置 `fitView`、`minZoom=0.1`、`maxZoom=4`<br>4. 添加 `<MiniMap>`、`<Controls>`、`<Background>` | 使用 `<ReactFlowProvider>` 包裹根组件 | 画布可缩放/平移，显示网格背景 |
| 1.2.2 | 小地图 + 缩放显示 | 1. 配置 MiniMap 组件（右下角）<br>2. 监听 `onMoveEnd` 获取当前 zoom 级别<br>3. 在状态栏显示缩放百分比 | `useReactFlow().getZoom()` | 缩放百分比实时显示，小地图可拖拽定位 |
| 1.2.3 | 画布交互优化 | 1. 配置平移：`panOnDrag=[1]`（中键拖拽）或空格+拖拽<br>2. 配置框选：`selectionOnDrag=true`<br>3. 配置缩放：`zoomOnScroll=true`<br>4. 禁止默认右键菜单 | 自定义 `panOnDrag` 和 `selectionKeyCode` | 平滑平移/缩放/框选体验 |

### 1.3 五种节点组件

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 1.3.1 | 类型定义 | 1. 定义 `NodeType` 枚举（`text/image/video/audio/script`）<br>2. 定义 `CanvasNode` 接口继承 `@xyflow/react` 的 `Node`<br>3. 定义 `NodeData` 联合类型<br>4. 定义 `PortType` 枚举（`prompt/reference/firstFrame/lastFrame/audio/data`） | 使用 TypeScript discriminated union | 类型完备，无 any |
| 1.3.2 | 文本节点 | 1. 创建 `<TextNode>` 组件<br>2. 支持双击编辑（textarea 或 contentEditable）<br>3. 右侧输出端口：`prompt`<br>4. 节点尺寸约 240×120<br>5. 折叠显示长文本（展开/收起） | `Handle` 组件定位：`position={Position.Right} type="source"` | 可输入/编辑文本，可连线输出 |
| 1.3.3 | 图片节点 | 1. 创建 `<ImageNode>` 组件<br>2. 左侧输入端口：`prompt`、`reference`<br>3. 右侧输出端口：`reference`、`firstFrame`、`lastFrame`<br>4. 显示缩略图或占位符<br>5. 拖拽上传图片文件支持<br>6. 点击节点底部「生成」按钮入口 | `onDrop` 事件处理文件拖入 | 可上传/显示图片，端口齐全 |
| 1.3.4 | 视频节点 | 1. 创建 `<VideoNode>` 组件<br>2. 左侧输入端口：`prompt`、`firstFrame`、`lastFrame`、`audio`<br>3. 右侧输出端口：`video`<br>4. 显示视频缩略图（首帧截图）<br>5. 播放按钮（点击弹出预览）<br>6. 生成进度条 | `<video>` 元素取首帧：`video.currentTime = 0.1` → canvas 截图 | 可上传/显示/预览视频 |
| 1.3.5 | 音频节点 | 1. 创建 `<AudioNode>` 组件<br>2. 右侧输出端口：`audio`<br>3. 显示音频波形缩略图（可选）或简单图标+名称<br>4. 支持拖拽上传 | — | 可上传/显示音频 |
| 1.3.6 | 脚本节点 | 1. 创建 `<ScriptNode>` 组件<br>2. 右侧输出端口：`script`<br>3. 内嵌脚本表格（5列：序号/画面描述/提示词/时长/运镜）<br>4. 「生成脚本」按钮（Phase 2 接入 LLM）<br>5. 「批量生成分镜图」按钮（Phase 2）<br>6. 「批量生成视频」按钮（Phase 2） | MVP 先做 UI，按钮置灰 | 表格可编辑，按钮 UI 就位 |

### 1.4 节点连线 & 数据流

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 1.4.1 | 端口连线 | 1. 为每种节点定义 `Handle` 位置和 ID<br>2. 实现 `onConnect` 回调，创建 Edge<br>3. 设置 `isValidConnection` 校验规则（类型兼容性）<br>4. 自定义 Edge 样式（贝塞尔曲线，深色主题适配） | `isValidConnection: (conn) => isPortCompatible(conn.sourceHandle, conn.targetHandle)` | 只允许合法端口连线，连线视觉正确 |
| 1.4.2 | 连线数据传递 | 1. 连线建立后，源节点的数据自动同步到目标节点<br>2. 示例：文本节点的 `content` → 连线 → 图片节点的 `prompt`<br>3. 数据变更时通过 Zustand store 触发联动 | 监听 `onNodesChange`，根据 edge 关系更新目标节点 | 连线后数据正确传递到目标节点 |
| 1.4.3 | 打组功能 | 1. 框选多节点 → Ctrl+G → 创建 Group<br>2. Group 视觉样式：半透明矩形 + 标题<br>3. Group 内节点整体移动 | React Flow 内置 `Group` 支持，或自定义 | 框选+Ctrl+G 打组成功，组内节点同步移动 |
| 1.4.4 | 撤销/重做 | 1. 使用 Zustand 中间件记录 nodes/edges 快照<br>2. Ctrl+Z 恢复上一快照<br>3. Ctrl+Shift+Z 重做<br>4. 限制历史栈深度 50 | `temporal` 中间件或手动 `past[]/future[]` 栈 | 撤销/重做正常工作 |

### 1.5 左侧栏 & 项目管理

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 1.5.1 | 左侧栏框架 | 1. 创建 `<Sidebar>` 组件（宽度 56px 可展开至 240px）<br>2. 4 个 Tab：节点 / 工具箱 / 资产 / 历史<br>3. 图标 + 文字标签 | — | 侧栏可展开/收起，4 Tab 切换正常 |
| 1.5.2 | 节点拖入 | 1. 侧栏显示 5 种节点类型<br>2. 拖拽到画布 → 在 drop 位置创建对应节点<br>3. `onDrop` + `onDragOver` 处理 | `react-dnd` 或原生 HTML5 drag | 从侧栏拖入画布可创建节点 |
| 1.5.3 | 右键菜单 | 1. 自定义 ContextMenu 组件<br>2. 右键节点：复制/删除/打组/创建工作流<br>3. 右键空白处：新建节点（5种类型）<br>4. 右键连线：删除连线 | 监听 `onNodeContextMenu`、`onPaneContextMenu` | 右键菜单功能完整 |
| 1.5.4 | 项目存取 | 1. 主进程 `project.ts`：读写 `project.json`<br>2. IPC：`project:create`、`project:load`、`project:save`<br>3. 启动页：最近项目列表 + 新建项目<br>4. 自动保存（每 30s 或失焦时） | `fs.promises.writeFile/readFile` | 项目可创建/打开/保存/自动保存 |
| 1.5.5 | 双击创建节点 | 1. 监听画布 `onPaneDoubleClick`<br>2. 弹出节点类型选择浮窗<br>3. 选择后在双击位置创建节点 | — | 双击空白处可创建节点 |

---

## Phase 2：模型配置 + 生成器（第 3-4 周）

### 2.1 配置系统

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 2.1.1 | config.yaml 解析 | 1. 安装 `yaml` 包<br>2. 主进程 `config.ts`：读取 `~/.localcanvas/config.yaml`<br>3. 解析为 `AppConfig` 类型<br>4. 环境变量替换：`${VAR_NAME}` → `process.env.VAR_NAME`<br>5. 校验配置完整性 | `yaml.parse()` + `process.env` 替换 + schema 校验 | 配置文件可正确解析，环境变量替换正常 |
| 2.1.2 | 配置 UI | 1. 创建 `<SettingsPanel>` 组件<br>2. 模型列表展示（图像/视频/LLM/TTS）<br>3. 添加/编辑/删除模型<br>4. 连通性测试（点击「测试连接」→ 主进程 ping 端点）<br>5. 设置默认模型 | IPC: `config:read`、`config:write`、`config:testConnection` | 可通过 UI 配置模型并测试连通性 |
| 2.1.3 | 首次引导 | 1. 检测 `config.yaml` 是否存在<br>2. 不存在则弹出引导界面<br>3. 引导配置至少一个 ComfyUI 端点<br>4. 自动生成示例配置文件 | — | 首次启动有引导流程 |

### 2.2 模型适配器

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 2.2.1 | 适配器基类 | 1. 定义 `ModelAdapter` 抽象类<br>2. 方法：`generateImage()`、`generateVideo()`、`generateText()`、`getStatus()`、`cancel()`<br>3. 事件：`onProgress`、`onComplete`、`onError` | `EventEmitter` 模式 | 基类接口清晰，子类可扩展 |
| 2.2.2 | ComfyUI 适配器 | 1. `ComfyUIAdapter` 实现<br>2. `generateImage()`：加载 workflow JSON → 填入参数 → `POST /prompt`<br>3. WebSocket 连接 `/ws?clientId=xxx` 监听进度<br>4. 解析进度消息 `{'type': 'progress', 'value': 3, 'max': 20}`<br>5. 完成后从 `/view?filename=xxx` 下载图片<br>6. `generateVideo()` 同理，下载 `.mp4` 文件 | `axios` for REST + `ws` for WebSocket；workflow JSON 参数替换逻辑 | 文生图 + 图生视频均可通过 ComfyUI 完成 |
| 2.2.3 | ComfyUI 工作流模板 | 1. 准备 3 个预置 workflow JSON：<br>   - `flux_dev_api.json`（文生图）<br>   - `img2img_api.json`（图生图）<br>   - `video_api.json`（图生视频）<br>2. 模板中用占位符 `{{PROMPT}}`、`{{WIDTH}}`、`{{HEIGHT}}`、`{{SEED}}`<br>3. 运行时替换为用户参数 | 从 ComfyUI UI 导出 API 格式 → 改造为模板 | 预置模板可直接使用 |
| 2.2.4 | OpenAI 兼容适配器 | 1. `OpenAICompatibleAdapter` 实现<br>2. `generateText()`：`POST /chat/completions`<br>3. 支持流式响应（SSE）<br>4. `generateImage()`：`POST /images/generations`（如支持） | `axios` + `ReadableStream` | 可调用 Qwen/DeepSeek 等 OpenAI 兼容接口 |
| 2.2.5 | 适配器工厂 | 1. `AdapterFactory.get(provider: string)` 工厂方法<br>2. 根据 `config.yaml` 中的 `provider` 字段返回对应适配器实例<br>3. 传入 endpoint / api_key / workflow 等配置 | 简单工厂模式 | 传入 provider 名称即可获取正确的适配器 |

### 2.3 生成器面板

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 2.3.1 | 生成器面板框架 | 1. 创建 `<GeneratorPanel>` 底部浮动面板<br>2. 选中节点后从底部滑出（高度约 200px）<br>3. 点击空白处收起<br>4. 根据节点类型显示不同的生成器 | 监听 `selectedNodes` 状态变化 | 面板可弹出/收起，内容随节点类型切换 |
| 2.3.2 | 图像生成器 | 1. 提示词输入框（正向 + 反向）<br>2. 模型下拉选择（从 config 读取 image_models）<br>3. 画幅比选择（1:1/16:9/9:16/3:4/4:3）<br>4. 参考图预览（从连线节点获取）<br>5. 生成数量选择（1-4）<br>6. 「生成」按钮 → 调用模型适配器 | IPC: `model:generateImage` | 填入参数点击生成，节点显示生成结果 |
| 2.3.3 | 视频生成器 | 1. 提示词输入（画面描述 + 运镜描述）<br>2. 模型下拉选择<br>3. 时长选择（3s/5s/10s）<br>4. 首帧参考预览<br>5. 尾帧参考预览<br>6. 运镜控制（6 种预设）<br>7. 「生成」按钮 | IPC: `model:generateVideo` | 视频生成参数完整，生成后节点显示视频 |
| 2.3.4 | 生成进度 | 1. 生成过程中节点显示进度条（0-100%）<br>2. 主进程通过 IPC 实时推送进度<br>3. 支持取消生成（`model:cancel`） | `ipcRenderer.on('model:progress', ...)` | 进度条实时更新，可取消 |
| 2.3.5 | 生成结果处理 | 1. 图片：下载到项目 `assets/images/` → 更新节点 `imageSrc`<br>2. 视频：下载到项目 `assets/videos/` → 更新节点 `videoSrc`<br>3. 生成失败：节点显示错误状态 + 重试按钮 | 主进程文件保存 + IPC 通知渲染进程 | 结果自动保存并显示在节点中 |

### 2.4 脚本节点

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 2.4.1 | 脚本生成 | 1. 脚本节点输入区：故事梗概文本框 + 角色描述<br>2. 点击「生成脚本」→ 调用 LLM<br>3. LLM prompt 模板：将故事转为 N 个分镜表格<br>4. 解析 LLM 输出为 `ScriptRow[]` 数组<br>5. 渲染为可编辑表格 | LLM prompt 工程要求严格输出 JSON 格式 | 输入故事 → 生成可编辑分镜表格 |
| 2.4.2 | 批量分镜图 | 1. 点击「批量生成分镜图」→ 遍历 `ScriptRow[]`<br>2. 为每行调用图像生成器（使用 `prompt` 字段）<br>3. 每生成一张图 → 自动在脚本节点旁创建图片节点<br>4. 脚本节点 → 图片节点自动连线 | 控制并发数 ≤ `max_concurrent_tasks` | 批量生成图片节点，自动连线 |
| 2.4.3 | 批量视频 | 1. 点击「批量生成视频」→ 遍历已生成的图片节点<br>2. 为每张图片调用视频生成器（图片作为首帧）<br>3. 自动创建视频节点并连线 | — | 批量生成视频节点，自动连线 |

### 2.5 LLM 集成

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 2.5.1 | LLM 调用服务 | 1. 主进程 `llm.ts`：封装 OpenAI 兼容接口调用<br>2. 支持流式/非流式<br>3. 支持从 config.yaml 读取多个 LLM 配置<br>4. 错误处理：超时/限流/格式错误 | `axios` + SSE 解析 | 可正确调用 LLM 并返回结果 |
| 2.5.2 | 文本节点 LLM 生成 | 1. 文本节点添加「AI 生成」按钮<br>2. 输入指令 → 调用 LLM → 结果填入文本框 | — | 文本节点可调用 LLM 生成内容 |

---

## Phase 3：视频合成 + 打磨（第 5-6 周）

### 3.1 FFmpeg 集成

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 3.1.1 | FFmpeg 检测与下载 | 1. 启动时检测本地 FFmpeg（`which ffmpeg` / `where ffmpeg`）<br>2. 未找到则提示下载<br>3. 下载到 `~/.localcanvas/bin/ffmpeg`<br>4. 或支持用户手动指定 FFmpeg 路径 | `child_process.exec('ffmpeg -version')` | FFmpeg 可用或引导用户安装 |
| 3.1.2 | FFmpeg 服务封装 | 1. 主进程 `ffmpeg.ts`：封装常用操作<br>2. `trimVideo(input, start, end, output)`<br>3. `concatVideos(inputs, output)`<br>4. `mergeAudioVideo(video, audio, output)`<br>5. `extractAudio(input, output)`<br>6. `getVideoInfo(input)` → 时长/分辨率/帧率 | `child_process.spawn('ffmpeg', [...args])` + 进度解析 | 所有 FFmpeg 操作可正常执行 |
| 3.1.3 | FFmpeg 进度回调 | 1. 解析 FFmpeg stderr 输出的进度信息<br>2. 通过 IPC 推送进度到渲染进程 | 正则解析 `time=00:00:05.23` | 合成进度实时显示 |

### 3.2 视频剪辑

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 3.2.1 | 视频预览播放器 | 1. 创建 `<VideoPreview>` 组件<br>2. 双击视频节点 → 弹出预览窗口<br>3. 播放/暂停/进度条/音量 | `<video>` 元素 | 双击可预览视频 |
| 3.2.2 | 入点/出点裁取 | 1. 预览器底部添加时间轴<br>2. 拖拽标记入点(I)/出点(O)<br>3. 点击「裁取」→ FFmpeg 裁取片段<br>4. 生成新的视频节点（裁取结果） | FFmpeg `-ss` `-to` 参数 | 可裁取视频片段并创建新节点 |
| 3.2.3 | 合成节点 | 1. 新增 `compose` 节点类型<br>2. 左侧输入端口：多个 `video` + `audio`<br>3. 选中后底部弹出时间轴编辑器 | — | 合成节点可接收多个视频+音频连线 |

### 3.3 时间轴编辑器

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 3.3.1 | 时间轴 UI | 1. 创建 `<Timeline>` 组件（底部面板，高度 200px）<br>2. 视频轨道：每个连线视频一行，显示缩略条<br>3. 拖拽调整顺序和起止时间<br>4. 音频轨道：视频下方<br>5. 播放指针 + 时间标尺 | 自定义 Canvas 或基于 `wavesurfer.js` 改造 | 时间轴可显示/拖拽/预览 |
| 3.3.2 | 合成导出 | 1. 点击「合成」→ 生成 FFmpeg concat 命令<br>2. 先生成 concat 文本列表（`file 'video1.mp4'` 格式）<br>3. 执行 `ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4`<br>4. 如需重编码则 `-c:v libx264 -c:a aac`<br>5. 合成完成后自动创建结果视频节点 | FFmpeg concat demuxer | 多视频可拼接导出为 MP4 |
| 3.3.3 | 音频混合 | 1. 视频轨道 + 音频轨道 → FFmpeg 混流<br>2. `ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4` | — | 音频可混入视频 |

### 3.4 项目管理界面

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 3.4.1 | 项目列表页 | 1. 创建 `<ProjectList>` 启动页<br>2. 显示所有项目（缩略图+名称+修改时间）<br>3. 新建项目 / 打开项目 / 删除项目<br>4. 最近打开记录 | `fs.readdirSync(projectsDir)` | 可管理多个项目 |
| 3.4.2 | 资产面板 | 1. 左侧栏「资产」Tab<br>2. 显示项目 assets/ 下的所有文件<br>3. 支持拖拽到画布创建节点<br>4. 支持从文件系统导入 | — | 资产可浏览/拖拽使用 |

### 3.5 深色主题

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 3.5.1 | 主题系统 | 1. 定义 CSS 变量（`--bg-primary`、`--text-primary`、`--accent` 等）<br>2. Tailwind `darkMode: 'class'`<br>3. 所有组件使用 CSS 变量配色 | Tailwind v4 主题配置 | 全局深色主题一致 |

---

## Phase 4：完善 + 发布（第 7 周）

### 4.1 自定义适配器

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.1.1 | CustomAdapter | 1. `CustomAdapter` 实现<br>2. 从 config 读取 `request_template` 和 `response_mapping`<br>3. 模板变量替换 `{{prompt}}` → 实际值<br>4. JSONPath 响应映射 `$.data.video_url` → 下载地址 | `jsonpath-plus` 库解析响应 | 自定义 HTTP 端点可正常调用 |
| 4.1.2 | Replicate 适配器 | 1. `ReplicateAdapter` 实现<br>2. 创建预测 → 轮询状态 → 下载结果<br>3. `POST /v1/predictions` → `GET /v1/predictions/{id}` 循环 | 轮询间隔 2s | Replicate 模型可正常使用 |

### 4.2 生成历史

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.2.1 | SQLite 初始化 | 1. 创建 `~/.localcanvas/history.db`<br>2. 建表：`generations(id, type, model, prompt, params, status, created_at, output_path)`<br>3. `better-sqlite3` 同步 API | — | 数据库可正确读写 |
| 4.2.2 | 历史面板 | 1. 左侧栏「历史」Tab<br>2. 显示所有生成记录（时间/类型/模型/缩略图）<br>3. 点击记录 → 创建新节点复用结果<br>4. 搜索/筛选功能 | — | 历史记录可查看和复用 |

### 4.3 工作流模板

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.3.1 | 工作流保存 | 1. 对打组节点 → 右键「保存为工作流」<br>2. 提取组内节点+连线 → 保存为 JSON<br>3. 存入 `~/.localcanvas/workflows/` | — | 打组节点可保存为模板 |
| 4.3.2 | 工作流加载 | 1. 左侧栏「工具箱」Tab 显示已保存的工作流<br>2. 拖入画布 → 实例化节点+连线<br>3. 预置 3 个常用工作流：<br>   - 文生图 → 图生视频<br>   - 脚本 → 分镜 → 批量视频<br>   - 首尾帧视频生成 | — | 工作流可保存/加载/复用 |

### 4.4 错误处理 & 稳定性

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.4.1 | API 错误处理 | 1. 网络超时 → 重试 1 次 + 提示<br>2. API 返回错误 → 显示错误信息 + 重试按钮<br>3. ComfyUI 离线 → 检测并提示启动<br>4. 限流 → 等待并自动重试 | `axios` timeout 60s + retry 逻辑 | 各种错误场景有友好提示 |
| 4.4.2 | 自动保存 | 1. 每 30s 自动保存 `project.json`<br>2. 窗口失焦时保存<br>3. 关闭窗口前保存<br>4. 异常退出后恢复（检测 `.tmp` 文件） | `debounce` + `beforeunload` | 不丢失用户数据 |
| 4.4.3 | 大文件处理 | 1. 视频文件 >100MB 时使用符号链接而非复制<br>2. 缩略图缓存（`~/.localcanvas/thumbnails/`）<br>3. 磁盘空间检查 | `fs.symlink` | 大文件不卡顿，磁盘不足有提示 |

### 4.5 打包发布

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.5.1 | electron-builder 配置 | 1. 配置 `electron-builder.yml`<br>2. Windows: NSIS 安装包<br>3. macOS: DMG<br>4. 排除 `resources/` 中的开发依赖 | — | 可构建安装包 |
| 4.5.2 | 代码签名 | 1. Windows: 代码签名证书<br>2. macOS: Apple Developer 证书 | — | 安装时无安全警告 |
| 4.5.3 | 自动更新 | 1. 集成 `electron-updater`<br>2. GitHub Releases 作为更新源<br>3. 检测新版本 → 提示下载安装 | — | 可检测并安装更新 |

### 4.6 使用文档

| # | 任务 | 详细步骤 | 技术要点 | 验收标准 |
|---|------|----------|----------|----------|
| 4.6.1 | README.md | 1. 项目介绍 + 截图<br>2. 安装步骤<br>3. ComfyUI 配置指南<br>4. 常见问题 FAQ | — | 新用户可按文档上手 |
| 4.6.2 | 快速入门指南 | 1. 5 分钟完成第一次视频生成<br>2. 图文并茂 | — | 5 分钟内可完成首次生成 |

---

## 附录：开发步骤依赖关系图

```
Phase 1（画布基础）
  1.1 Electron窗口 ──→ 1.2 React Flow画布 ──→ 1.3 节点组件
                                                     │
                                              1.4 连线 & 数据流
                                                     │
                                              1.5 左侧栏 & 项目
                                                     │
Phase 2（模型+生成）                                 │
  2.1 配置系统 ←────────────────────────────────────┘
    │
    ├── 2.2 模型适配器 ──→ 2.3 生成器面板
    │                            │
    │                     2.4 脚本节点 ←── 2.5 LLM集成
    │
Phase 3（合成+打磨）
  3.1 FFmpeg集成 ──→ 3.2 视频剪辑 ──→ 3.3 时间轴
                                            │
  3.4 项目管理界面                           │
  3.5 深色主题                               │
                                            │
Phase 4（完善+发布）                        │
  4.1 自定义适配器                           │
  4.2 生成历史                               │
  4.3 工作流模板                             │
  4.4 错误处理                               │
  4.5 打包发布                               │
  4.6 使用文档                               │
```

---

## 附录：关键验收检查清单

### Phase 1 验收

- [ ] 应用可启动，显示空白画布
- [ ] 画布可缩放/平移/小地图导航
- [ ] 5 种节点可通过双击/拖入/右键创建
- [ ] 节点可连线，数据正确传递
- [ ] Ctrl+G 打组，Ctrl+Z 撤销
- [ ] 项目可创建/保存/打开

### Phase 2 验收

- [ ] config.yaml 可配置模型
- [ ] ComfyUI 适配器可文生图 + 图生视频
- [ ] 图像生成器面板完整可用
- [ ] 视频生成器面板完整可用
- [ ] 脚本节点可生成脚本 → 批量分镜图 → 批量视频
- [ ] 生成进度实时显示

### Phase 3 验收

- [ ] FFmpeg 可裁取视频片段
- [ ] 多视频可拼接合成导出 MP4
- [ ] 时间轴编辑器可用
- [ ] 音频可混入视频
- [ ] 深色主题统一

### Phase 4 验收

- [ ] 自定义 HTTP 端点可配置使用
- [ ] 生成历史可查看/复用
- [ ] 工作流可保存/加载
- [ ] 各种错误有友好提示
- [ ] Windows 安装包可正常安装运行

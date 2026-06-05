# LocalCanvas v1 — 画布基础 + 节点系统

> **版本目标**：搭建完整应用骨架，实现无限画布与五种节点的创建、编辑、连线、打组，以及项目本地存取  
> **预计周期**：2 周（10 个工作日）  
> **前置条件**：Node.js 18+ / npm 9+ / Git  
> **生成日期**：2026-06-04

---

## 一、版本功能清单

| # | 功能模块 | 子功能 | 优先级 | 状态 |
|---|----------|--------|--------|------|
| 1 | 应用启动 | Electron 窗口创建 + 生命周期 | P0 | ✅ |
| 2 | IPC 通信 | 主进程/渲染进程 Bridge | P0 | ✅ |
| 3 | 无限画布 | React Flow 集成 + 缩放/平移/小地图 | P0 | ✅ |
| 4 | 文本节点 | 创建/编辑/LLM 输出端口 | P0 | ✅ |
| 5 | 图片节点 | 创建/上传/输入输出端口 | P0 | ✅ |
| 6 | 视频节点 | 创建/上传/预览/输入输出端口 | P0 | ⚠️ 内联播放已实现；首帧缩略图/弹窗预览留 v3 |
| 7 | 音频节点 | 创建/上传/输出端口 | P0 | ✅ |
| 8 | 脚本节点 | 创建/脚本表格 UI/按钮占位 | P0 | ✅ |
| 9 | 节点连线 | 端口连线 + 数据流传递 | P0 | ✅ |
| 10 | 打组 | 框选 + Ctrl+G | P0 | ✅ |
| 11 | 撤销/重做 | Ctrl+Z / Ctrl+Shift+Z | P0 | ✅ |
| 12 | 右键菜单 | 新建节点/复制/删除/打组/保存工作流 | P1 | ✅ |
| 13 | 双击创建 | 双击空白处弹出节点选择 | P1 | ✅ |
| 14 | 左侧栏 | 节点拖入/工具箱/资产/历史 | P1 | ⚠️ 节点 Tab 完整；工具/资产/历史为 v2+ 占位 |
| 15 | 项目存取 | 创建/打开/保存/自动保存 | P0 | ✅ |
| 16 | 启动页 | 最近项目列表 + 新建入口 | P1 | ✅ |
| 17 | 深色主题 | CSS 变量 + Tailwind 暗色 | P2 | ✅ |
| 18 | 文件拖入 | 拖拽文件到画布自动创建节点 | P1 | ✅ |

---

## 二、技术架构（v1 范围）

```
┌─────────────────────────────────────────────────────────┐
│ Main Process（轻量，仅窗口管理 + IPC 路由 + 数据库）     │
│ ├── 窗口管理 (BrowserWindow)                             │
│ ├── IPC Handler                                         │
│ │   ├── project:create / project:load / project:save    │
│ │   ├── file:readAsset / file:writeAsset                │
│ │   └── app:getVersion                                  │
│ ├── SQLite 数据库 (better-sqlite3)                      │
│ │   ├── 项目表 + 节点表 + 连线表 + 分组表               │
│ │   ├── IRepository<T> 统一抽象层                       │
│ │   └── WAL 模式启用                                    │
│ ├── 项目服务 (project.ts)                               │
│ │   ├── SQLite CRUD (唯一数据源)                        │
│ │   ├── JSON 导入/导出 (仅用于便携分享)                 │
│ │   ├── 管理 assets/ 目录                                │
│ │   └── 自动保存 (debounce 30s, 写入 SQLite)           │
│ ├── 日志服务 (electron-log)                             │
│ └── 配置服务 (config.ts, v1 只读取基础配置)              │
│                                                          │
│ ┌───────────────────────────────────────────────────────┐│
│ │ Utility Process (v1 预留，v2 实际使用)               ││
│ │ └── (v2 起承载模型 API 调用 + FFmpeg)               ││
│ └───────────────────────────────────────────────────────┘│
│                                                          │
│ ┌───────────────────────────────────────────────────────┐│
│ │ Renderer Process (React 19)                          ││
│ │ ├── React Flow 12 画布引擎                            ││
│ │ │   ├── <ReactFlow> 容器                              ││
│ │ │   ├── <MiniMap> 小地图                               ││
│ │ │   ├── <Controls> 缩放控件                            ││
│ │ │   └── <Background> 网格背景                          ││
│ │ ├── 自定义节点组件                                     ││
│ │ │   ├── TextNode / ImageNode / VideoNode              ││
│ │ │   ├── AudioNode / ScriptNode                        ││
│ │ │   └── ComposeNode (占位)                             ││
│ │ ├── 左侧栏 (Sidebar)                                  ││
│ │ ├── Zustand Store (三层拆分)                           ││
│ │ │   ├── Domain State (nodes/edges/viewport)           ││
│ │ │   ├── UI State (选中/面板/模态框)                    ││
│ │ │   └── Async State (保存状态/加载状态)               ││
│ │ ├── 错误处理 (ErrorHandler)                           ││
│ │ ├── 日志 (electron-log renderer)                      ││
│ │ ├── i18n (i18next, v1 预留接口)                       ││
│ │ └── Tailwind CSS + CSS Variables 主题                  ││
│ └───────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 三、项目脚手架搭建

### 3.1 创建项目

```bash
# Step 1: 创建 Vite + React + TypeScript 项目
npm create vite@latest localcanvas -- --template react-ts
cd localcanvas

# Step 2: 安装 Electron 核心依赖
npm install electron@33 @electron-toolkit/preload @electron-toolkit/utils
npm install -D electron-vite electron-builder

# Step 3: 安装前端核心依赖
npm install @xyflow/react@12 zustand@5 tailwindcss@4
npm install uuid@10

# Step 4: 安装后端依赖
npm install better-sqlite3@11 yaml@2 axios@1 ws@8
npm install -D @types/better-sqlite3 @types/ws @types/uuid
```

### 3.2 目录结构

```
localcanvas/
├── electron/
│   ├── main/
│   │   ├── index.ts               # 主进程入口
│   │   ├── ipc/
│   │   │   ├── index.ts           # IPC 注册中心
│   │   │   ├── project.ts         # 项目相关 IPC
│   │   │   └── file.ts           # 文件操作 IPC
│   │   └── services/
│   │       ├── project.ts         # 项目文件服务
│   │       └── config.ts          # 配置服务 (v1 只读取基础配置)
│   └── preload/
│       └── index.ts               # preload 脚本
├── src/
│   ├── main.tsx                   # React 入口
│   ├── App.tsx                    # 根组件
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx         # 画布主组件
│   │   │   ├── CanvasToolbar.tsx  # 画布工具栏
│   │   │   └── ContextMenu.tsx    # 右键菜单
│   │   ├── nodes/
│   │   │   ├── TextNode.tsx
│   │   │   ├── ImageNode.tsx
│   │   │   ├── VideoNode.tsx
│   │   │   ├── AudioNode.tsx
│   │   │   ├── ScriptNode.tsx
│   │   │   └── BaseNode.tsx       # 节点基础壳组件
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NodePanel.tsx      # 节点拖入面板
│   │   │   ├── ToolPanel.tsx      # 工具箱面板
│   │   │   ├── AssetPanel.tsx     # 资产面板
│   │   │   └── HistoryPanel.tsx   # 历史面板
│   │   ├── project/
│   │   │   ├── StartPage.tsx      # 启动页
│   │   │   └── ProjectCard.tsx    # 项目卡片
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Tooltip.tsx
│   ├── stores/
│   │   ├── canvasStore.ts        # 画布状态
│   │   ├── projectStore.ts       # 项目状态
│   │   └── historyStore.ts       # 撤销/重做
│   ├── hooks/
│   │   ├── useAutoSave.ts        # 自动保存
│   │   ├── useKeyboard.ts        # 快捷键
│   │   └── useFileDrop.ts        # 文件拖入
│   ├── types/
│   │   ├── node.ts               # 节点类型
│   │   ├── project.ts            # 项目类型
│   │   └── ipc.ts                # IPC 类型
│   ├── utils/
│   │   ├── id.ts                 # ID 生成
│   │   ├── file.ts               # 文件工具
│   │   └── constants.ts          # 常量
│   └── styles/
│       ├── index.css             # 全局样式
│       ├── theme.css             # 主题变量
│       └── nodes.css             # 节点样式
├── resources/
│   └── icons/                    # 节点图标 SVG
├── package.json
├── electron.vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### 3.3 electron.vite.config.ts

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: resolve(__dirname, 'electron/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload/index.ts')
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  }
})
```

---

## 四、详细开发步骤

### Day 1：Electron 骨架 + IPC

#### Step 1.1 主进程入口

**文件**：`electron/main/index.ts`

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'LocalCanvas',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发环境加载 dev server
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

**验收**：`npm run dev` 启动后显示空白 Electron 窗口

---

#### Step 1.2 Preload 脚本

**文件**：`electron/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 项目操作
  project: {
    create: (name: string) => ipcRenderer.invoke('project:create', name),
    load: (projectId: string) => ipcRenderer.invoke('project:load', projectId),
    save: (data: string) => ipcRenderer.invoke('project:save', data),
    list: () => ipcRenderer.invoke('project:list'),
    delete: (projectId: string) => ipcRenderer.invoke('project:delete', projectId),
  },
  // 文件操作
  file: {
    readAsset: (projectId: string, relativePath: string) =>
      ipcRenderer.invoke('file:readAsset', projectId, relativePath),
    writeAsset: (projectId: string, relativePath: string, data: ArrayBuffer) =>
      ipcRenderer.invoke('file:writeAsset', projectId, relativePath, data),
    selectFile: (filters: Electron.FileFilter[]) =>
      ipcRenderer.invoke('file:selectFile', filters),
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
  },
  // 应用信息
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
  },
  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['project:autoSaved', 'file:changed']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
```

**验收**：渲染进程可通过 `window.api.project.xxx()` 调用主进程方法

---

#### Step 1.3 IPC 注册中心

**文件**：`electron/main/ipc/index.ts`

```typescript
import { registerProjectIpc } from './project'
import { registerFileIpc } from './file'

export function registerIpcHandlers() {
  registerProjectIpc()
  registerFileIpc()
}
```

**文件**：`electron/main/ipc/project.ts`

```typescript
import { ipcMain, app, dialog } from 'electron'
import {
  createProject,
  loadProject,
  saveProject,
  listProjects,
  deleteProject,
} from '../services/project'

export function registerProjectIpc() {
  ipcMain.handle('project:create', async (_e, name: string) => {
    return createProject(name)
  })

  ipcMain.handle('project:load', async (_e, projectId: string) => {
    return loadProject(projectId)
  })

  ipcMain.handle('project:save', async (_e, data: string) => {
    return saveProject(JSON.parse(data))
  })

  ipcMain.handle('project:list', async () => {
    return listProjects()
  })

  ipcMain.handle('project:delete', async (_e, projectId: string) => {
    return deleteProject(projectId)
  })

  ipcMain.handle('app:getDataPath', () => {
    return app.getPath('userData')
  })
}
```

**验收**：所有 IPC channel 注册完毕，无报错

---

#### Step 1.4 项目文件服务

**文件**：`electron/main/services/project.ts`

```typescript
import { app } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile, rm, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuid } from 'uuid'

const DATA_DIR = join(app.getPath('userData'), 'LocalCanvas')

interface ProjectData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  viewport: { x: number; y: number; zoom: number }
  nodes: any[]
  edges: any[]
  groups: any[]
}

function projectDir(projectId: string) {
  return join(DATA_DIR, 'projects', projectId)
}

function projectJsonPath(projectId: string) {
  return join(projectDir(projectId), 'project.json')
}

export async function createProject(name: string): Promise<ProjectData> {
  const id = uuid()
  const dir = projectDir(id)
  await mkdir(dir, { recursive: true })
  await mkdir(join(dir, 'assets', 'images'), { recursive: true })
  await mkdir(join(dir, 'assets', 'videos'), { recursive: true })
  await mkdir(join(dir, 'assets', 'audios'), { recursive: true })
  await mkdir(join(dir, 'workflows'), { recursive: true })

  const project: ProjectData = {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
    groups: [],
  }

  await writeFile(projectJsonPath(id), JSON.stringify(project, null, 2), 'utf-8')
  return project
}

export async function loadProject(projectId: string): Promise<ProjectData> {
  const raw = await readFile(projectJsonPath(projectId), 'utf-8')
  return JSON.parse(raw)
}

export async function saveProject(data: ProjectData): Promise<void> {
  data.updatedAt = new Date().toISOString()
  await writeFile(
    projectJsonPath(data.id),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

export async function listProjects(): Promise<Array<{ id: string; name: string; updatedAt: string }>> {
  const projectsDir = join(DATA_DIR, 'projects')
  if (!existsSync(projectsDir)) return []

  const dirs = await readdir(projectsDir, { withFileTypes: true })
  const projects = []

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue
    try {
      const raw = await readFile(join(projectsDir, dir.name, 'project.json'), 'utf-8')
      const data = JSON.parse(raw)
      projects.push({
        id: data.id,
        name: data.name,
        updatedAt: data.updatedAt,
      })
    } catch { /* 跳过损坏的项目 */ }
  }

  return projects.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function deleteProject(projectId: string): Promise<void> {
  await rm(projectDir(projectId), { recursive: true, force: true })
}
```

**验收**：项目可创建、打开、保存、列表、删除

---

### Day 2：React Flow 画布集成

#### Step 2.1 画布主组件

**文件**：`src/components/canvas/Canvas.tsx`

```tsx
import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '../../stores/canvasStore'
import { TextNode } from '../nodes/TextNode'
import { ImageNode } from '../nodes/ImageNode'
import { VideoNode } from '../nodes/VideoNode'
import { AudioNode } from '../nodes/AudioNode'
import { ScriptNode } from '../nodes/ScriptNode'
import { ContextMenu } from './ContextMenu'
import { CanvasToolbar } from './CanvasToolbar'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
}

function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setViewport } = useCanvasStore()
  const reactFlow = useReactFlow()

  const handleConnect = useCallback((connection: Connection) => {
    onConnect(connection)
  }, [onConnect])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        selectionOnDrag
        panOnDrag={[1]}        // 中键平移
        panOnScroll={false}
        zoomOnScroll
        deleteKeyCode="Delete"
        className="bg-[#1a1a2e]"
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 2 },
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
        <Controls className="!bg-[#16213e] !border-[#0f3460] [&>button]:!bg-[#16213e] [&>button]:!border-[#0f3460] [&>button]:!fill-white" />
        <MiniMap
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              text: '#8b5cf6',
              image: '#06b6d4',
              video: '#f43f5e',
              audio: '#22c55e',
              script: '#f59e0b',
            }
            return colors[node.type || 'text'] || '#6366f1'
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-[#16213e] !border-[#0f3460]"
        />
      </ReactFlow>

      {/* 缩放百分比 */}
      <div className="absolute bottom-4 left-4 bg-[#16213e]/80 px-2 py-1 rounded text-xs text-gray-400">
        {Math.round(reactFlow.getZoom() * 100)}%
      </div>

      <ContextMenu />
      <CanvasToolbar />
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
```

**验收**：画布可缩放/平移，显示网格背景，小地图可导航

---

#### Step 2.2 画布状态管理

**文件**：`src/stores/canvasStore.ts`

```typescript
import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import { pushHistory } from './historyStore'

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
  selectedNodeIds: string[]

  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Partial<any>) => void
  removeNodes: (ids: string[]) => void
  groupNodes: (ids: string[]) => void
  setSelectedNodes: (ids: string[]) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  loadProject: (nodes: Node[], edges: Edge[]) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes: NodeChange[]) => {
    // 记录历史（仅在有意义变更时）
    const hasPositionChange = changes.some(c => c.type === 'position' && c.dragging === false)
    const hasRemoveChange = changes.some(c => c.type === 'remove')

    set({ nodes: applyNodeChanges(changes, get().nodes) })

    if (hasPositionChange || hasRemoveChange) {
      pushHistory({ nodes: get().nodes, edges: get().edges })
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
    const hasRemoveChange = changes.some(c => c.type === 'remove')
    if (hasRemoveChange) {
      pushHistory({ nodes: get().nodes, edges: get().edges })
    }
  },

  onConnect: (connection: Connection) => {
    set({ edges: addEdge(
      {
        ...connection,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      },
      get().edges
    )})
    pushHistory({ nodes: get().nodes, edges: get().edges })
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] })
    pushHistory({ nodes: get().nodes, edges: get().edges })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })
  },

  removeNodes: (ids) => {
    set({
      nodes: get().nodes.filter(n => !ids.includes(n.id)),
      edges: get().edges.filter(e => !ids.includes(e.source) && !ids.includes(e.target)),
    })
    pushHistory({ nodes: get().nodes, edges: get().edges })
  },

  groupNodes: (ids) => {
    // React Flow Group 实现：创建一个 type='group' 的父节点
    const childNodes = get().nodes.filter(n => ids.includes(n.id))
    if (childNodes.length === 0) return

    // 计算组边界
    const minX = Math.min(...childNodes.map(n => n.position.x))
    const minY = Math.min(...childNodes.map(n => n.position.y))
    const groupNode: Node = {
      id: `group-${Date.now()}`,
      type: 'group',
      position: { x: minX - 20, y: minY - 40 },
      style: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        border: '1px dashed #6366f1',
        borderRadius: 8,
        width: 400,
        height: 300,
      },
      data: { label: 'Group' },
    }

    // 设置子节点的 parentId
    const updatedNodes = get().nodes.map(n =>
      ids.includes(n.id)
        ? { ...n, parentId: groupNode.id, position: { x: n.position.x - minX + 20, y: n.position.y - minY + 40 } }
        : n
    )

    set({ nodes: [...updatedNodes, groupNode] })
    pushHistory({ nodes: get().nodes, edges: get().edges })
  },

  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),

  setViewport: (viewport) => set({ viewport }),

  loadProject: (nodes, edges) => set({ nodes, edges }),
}))
```

---

#### Step 2.3 撤销/重做

**文件**：`src/stores/historyStore.ts`

```typescript
interface HistoryEntry {
  nodes: any[]
  edges: any[]
}

const MAX_HISTORY = 50

const past: HistoryEntry[] = []
let future: HistoryEntry[] = []

export function pushHistory(entry: HistoryEntry) {
  past.push(JSON.parse(JSON.stringify(entry)))
  if (past.length > MAX_HISTORY) past.shift()
  future = [] // 新操作清空 future
}

export function undo(): HistoryEntry | null {
  if (past.length === 0) return null
  const entry = past.pop()!
  future.push(entry)
  return entry
}

export function redo(): HistoryEntry | null {
  if (future.length === 0) return null
  const entry = future.pop()!
  past.push(entry)
  return entry
}

export function canUndo() { return past.length > 0 }
export function canRedo() { return future.length > 0 }
```

**验收**：Ctrl+Z 撤销、Ctrl+Shift+Z 重做正常工作

---

### Day 3-4：五种节点组件

#### Step 3.1 节点基础壳

**文件**：`src/components/nodes/BaseNode.tsx`

```tsx
import { type ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface BaseNodeProps {
  id: string
  data: Record<string, any>
  type: string
  color: string
  icon: ReactNode
  title: string
  children: ReactNode
  inputs?: Array<{ id: string; label?: string }>
  outputs?: Array<{ id: string; label?: string }>
  selected?: boolean
}

export function BaseNode({
  color,
  icon,
  title,
  children,
  inputs = [],
  outputs = [],
  selected,
}: BaseNodeProps) {
  return (
    <div
      className={`
        min-w-[200px] rounded-lg border-2 bg-[#16213e] shadow-lg
        transition-shadow duration-200
        ${selected ? `border-[${color}] shadow-[0_0_20px_${color}40]` : 'border-[#0f3460]'}
      `}
      style={{ borderColor: selected ? color : undefined }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
        <span>{title}</span>
      </div>

      {/* 内容区 */}
      <div className="px-3 py-2">
        {children}
      </div>

      {/* 输入端口 */}
      {inputs.map((input, i) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: 60 + i * 24, background: color, width: 10, height: 10 }}
        >
          {input.label && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 whitespace-nowrap">
              {input.label}
            </span>
          )}
        </Handle>
      ))}

      {/* 输出端口 */}
      {outputs.map((output, i) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: 60 + i * 24, background: color, width: 10, height: 10 }}
        >
          {output.label && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 whitespace-nowrap">
              {output.label}
            </span>
          )}
        </Handle>
      ))}
    </div>
  )
}
```

---

#### Step 3.2 文本节点

**文件**：`src/components/nodes/TextNode.tsx`

```tsx
import { memo, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { Handle, Position } from '@xyflow/react'

function TextNodeComponent({ id, data, selected }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(data.content || '')

  return (
    <BaseNode
      id={id}
      data={data}
      type="text"
      color="#8b5cf6"
      icon={<span className="text-sm">📝</span>}
      title="文本"
      selected={selected}
      outputs={[{ id: 'prompt', label: '提示词' }]}
    >
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full h-24 bg-[#0f3460] text-white text-xs p-2 rounded resize-none outline-none"
          autoFocus
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[60px] text-xs text-gray-300 cursor-text whitespace-pre-wrap break-words"
        >
          {content || <span className="text-gray-500 italic">点击输入文本...</span>}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />
    </BaseNode>
  )
}

export const TextNode = memo(TextNodeComponent)
```

---

#### Step 3.3 图片节点

**文件**：`src/components/nodes/ImageNode.tsx`

```tsx
import { memo, useRef, useCallback } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        updateNodeData(id, { imageSrc: reader.result as string, fileName: file.name })
      }
      reader.readAsDataURL(file)
    }
  }, [id, updateNodeData])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        updateNodeData(id, { imageSrc: reader.result as string, fileName: file.name })
      }
      reader.readAsDataURL(file)
    }
  }, [id, updateNodeData])

  return (
    <BaseNode
      id={id}
      data={data}
      type="image"
      color="#06b6d4"
      icon={<span className="text-sm">🖼️</span>}
      title="图片"
      selected={selected}
      inputs={[
        { id: 'prompt', label: '提示词' },
        { id: 'reference', label: '参考图' },
      ]}
      outputs={[
        { id: 'reference', label: '参考图' },
        { id: 'firstFrame', label: '首帧' },
        { id: 'lastFrame', label: '尾帧' },
      ]}
    >
      <div
        className="w-[180px] h-[120px] bg-[#0f3460] rounded flex items-center justify-center cursor-pointer"
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        {data.imageSrc ? (
          <img
            src={data.imageSrc}
            alt=""
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-gray-500 text-xs text-center">
            <div className="text-2xl mb-1">📁</div>
            拖入或点击上传
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* 生成按钮占位 */}
      <button className="mt-2 w-full text-xs bg-cyan-600/30 text-cyan-300 py-1 rounded hover:bg-cyan-600/50 transition">
        ✨ 生成 (v2)
      </button>

      <Handle type="target" position={Position.Left} id="prompt"
        style={{ top: '30%', background: '#06b6d4', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="reference"
        style={{ top: '60%', background: '#06b6d4', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="reference"
        style={{ top: '30%', background: '#06b6d4', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="firstFrame"
        style={{ top: '55%', background: '#06b6d4', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="lastFrame"
        style={{ top: '80%', background: '#06b6d4', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const ImageNode = memo(ImageNodeComponent)
```

---

#### Step 3.4 视频节点

**文件**：`src/components/nodes/VideoNode.tsx`

```tsx
import { memo, useRef, useCallback, useState } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function VideoNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      updateNodeData(id, { videoSrc: url, fileName: file.name })
    }
  }, [id, updateNodeData])

  return (
    <BaseNode
      id={id}
      data={data}
      type="video"
      color="#f43f5e"
      icon={<span className="text-sm">🎥</span>}
      title="视频"
      selected={selected}
      inputs={[
        { id: 'prompt', label: '提示词' },
        { id: 'firstFrame', label: '首帧' },
        { id: 'lastFrame', label: '尾帧' },
        { id: 'audio', label: '音频' },
      ]}
      outputs={[{ id: 'video', label: '视频' }]}
    >
      <div className="w-[200px] h-[120px] bg-[#0f3460] rounded relative overflow-hidden">
        {data.videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={data.videoSrc}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition"
              onClick={() => {
                if (isPlaying) videoRef.current?.pause()
                else videoRef.current?.play()
              }}
            >
              <span className="text-2xl text-white">{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </>
        ) : (
          <div
            className="flex items-center justify-center h-full text-gray-500 text-xs text-center cursor-pointer"
            onClick={() => document.getElementById(`video-input-${id}`)?.click()}
          >
            <div>
              <div className="text-2xl mb-1">🎬</div>
              拖入或上传视频
            </div>
          </div>
        )}
      </div>

      {/* 进度条占位 */}
      {data.isGenerating && (
        <div className="mt-2 w-full bg-[#0f3460] rounded-full h-1.5">
          <div
            className="bg-rose-500 h-1.5 rounded-full transition-all"
            style={{ width: `${data.progress || 0}%` }}
          />
        </div>
      )}

      <button className="mt-2 w-full text-xs bg-rose-600/30 text-rose-300 py-1 rounded hover:bg-rose-600/50 transition">
        ✨ 生成 (v2)
      </button>

      <input id={`video-input-${id}`} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

      <Handle type="target" position={Position.Left} id="prompt"
        style={{ top: '20%', background: '#f43f5e', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="firstFrame"
        style={{ top: '40%', background: '#f43f5e', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="lastFrame"
        style={{ top: '60%', background: '#f43f5e', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} id="audio"
        style={{ top: '80%', background: '#f43f5e', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="video"
        style={{ top: '50%', background: '#f43f5e', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const VideoNode = memo(VideoNodeComponent)
```

---

#### Step 3.5 音频节点

**文件**：`src/components/nodes/AudioNode.tsx`

```tsx
import { memo, useCallback } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

function AudioNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file)
      updateNodeData(id, { audioSrc: url, fileName: file.name })
    }
  }, [id, updateNodeData])

  return (
    <BaseNode
      id={id}
      data={data}
      type="audio"
      color="#22c55e"
      icon={<span className="text-sm">🎵</span>}
      title="音频"
      selected={selected}
      outputs={[{ id: 'audio', label: '音频' }]}
    >
      <div
        className="w-[160px] h-[60px] bg-[#0f3460] rounded flex items-center justify-center cursor-pointer"
        onClick={() => document.getElementById(`audio-input-${id}`)?.click()}
      >
        {data.audioSrc ? (
          <div className="flex items-center gap-2 text-green-300 text-xs">
            <span>🎵</span>
            <span className="truncate max-w-[100px]">{data.fileName || '音频'}</span>
          </div>
        ) : (
          <div className="text-gray-500 text-xs text-center">
            点击上传音频
          </div>
        )}
      </div>

      {data.audioSrc && (
        <audio src={data.audioSrc} controls className="mt-2 w-full h-8" />
      )}

      <input id={`audio-input-${id}`} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />

      <Handle type="source" position={Position.Right} id="audio"
        style={{ top: '50%', background: '#22c55e', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const AudioNode = memo(AudioNodeComponent)
```

---

#### Step 3.6 脚本节点

**文件**：`src/components/nodes/ScriptNode.tsx`

```tsx
import { memo, useState } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'

interface ScriptRow {
  id: string
  sequence: number
  description: string
  prompt: string
  duration: number
  camera: string
}

function ScriptNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const [storyInput, setStoryInput] = useState(data.storyInput || '')

  const rows: ScriptRow[] = data.scriptRows || []

  const addRow = () => {
    const newRow: ScriptRow = {
      id: `row-${Date.now()}`,
      sequence: rows.length + 1,
      description: '',
      prompt: '',
      duration: 5,
      camera: '静止',
    }
    updateNodeData(id, { scriptRows: [...rows, newRow] })
  }

  const updateRow = (rowId: string, field: keyof ScriptRow, value: any) => {
    const updated = rows.map(r => r.id === rowId ? { ...r, [field]: value } : r)
    updateNodeData(id, { scriptRows: updated })
  }

  return (
    <BaseNode
      id={id}
      data={data}
      type="script"
      color="#f59e0b"
      icon={<span className="text-sm">🎬</span>}
      title="脚本"
      selected={selected}
      outputs={[{ id: 'script', label: '脚本' }]}
    >
      {/* 故事输入 */}
      <textarea
        value={storyInput}
        onChange={(e) => {
          setStoryInput(e.target.value)
          updateNodeData(id, { storyInput: e.target.value })
        }}
        placeholder="输入故事梗概..."
        className="w-full h-16 bg-[#0f3460] text-white text-xs p-2 rounded resize-none outline-none"
      />

      {/* 操作按钮 */}
      <div className="flex gap-1 mt-2">
        <button className="flex-1 text-xs bg-amber-600/30 text-amber-300 py-1 rounded hover:bg-amber-600/50 transition disabled:opacity-50" disabled>
          🤖 生成脚本 (v2)
        </button>
      </div>

      {/* 分镜表格 */}
      {rows.length > 0 && (
        <div className="mt-2 max-h-[200px] overflow-y-auto">
          <table className="w-full text-[10px] text-gray-300">
            <thead>
              <tr className="text-gray-500">
                <th className="px-1 text-left">#</th>
                <th className="px-1 text-left">画面</th>
                <th className="px-1 text-left">提示词</th>
                <th className="px-1">时长</th>
                <th className="px-1">运镜</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-[#0f3460]">
                  <td className="px-1 py-1">{row.sequence}</td>
                  <td className="px-1 py-1">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      className="w-full bg-transparent outline-none text-white"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={row.prompt}
                      onChange={(e) => updateRow(row.id, 'prompt', e.target.value)}
                      className="w-full bg-transparent outline-none text-white"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">{row.duration}s</td>
                  <td className="px-1 py-1 text-center">{row.camera}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-1 mt-2">
        <button onClick={addRow} className="text-[10px] text-amber-300 hover:underline">+ 添加分镜</button>
        <button className="text-[10px] text-amber-300/50 ml-auto disabled" disabled>生成分镜图 (v2)</button>
        <button className="text-[10px] text-amber-300/50 disabled" disabled>生成视频 (v2)</button>
      </div>

      <Handle type="source" position={Position.Right} id="script"
        style={{ top: '50%', background: '#f59e0b', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const ScriptNode = memo(ScriptNodeComponent)
```

**验收**：
- 5 种节点均可通过双击/拖入/右键创建
- 各节点的输入输出端口显示正确
- 文本节点可编辑文本
- 图片/视频/音频节点支持文件上传
- 脚本节点可添加/编辑分镜行

---

### Day 5：连线 + 数据流

#### Step 5.1 端口校验规则

**文件**：`src/utils/portCompat.ts`

```typescript
// 端口类型兼容性矩阵
// source → target 是否允许连线
const COMPAT_MAP: Record<string, string[]> = {
  // 文本节点输出
  'text:prompt':       ['image:prompt', 'video:prompt'],
  // 图片节点输出
  'image:reference':   ['image:reference', 'video:firstFrame', 'video:lastFrame'],
  'image:firstFrame':  ['video:firstFrame'],
  'image:lastFrame':   ['video:lastFrame'],
  // 视频节点输出
  'video:video':       ['compose:video'],
  // 音频节点输出
  'audio:audio':       ['video:audio', 'compose:audio'],
  // 脚本节点输出
  'script:script':     ['image:prompt'],
}

export function isPortCompatible(
  sourceType: string,
  sourceHandle: string | null,
  targetType: string,
  targetHandle: string | null
): boolean {
  if (!sourceHandle || !targetHandle) return true // 允许默认连接
  const key = `${sourceType}:${sourceHandle}`
  const allowed = COMPAT_MAP[key]
  if (!allowed) return false
  return allowed.includes(`${targetType}:${targetHandle}`)
}
```

#### Step 5.2 连线数据传递

**文件**：`src/hooks/useDataFlow.ts`

```typescript
import { useEffect } from 'react'
import { useCanvasStore } from '../stores/canvasStore'

/**
 * 监听连线变化，自动同步源节点数据到目标节点
 * 例如：文本节点 content → 图片节点 prompt
 */
export function useDataFlow() {
  const { nodes, edges, updateNodeData } = useCanvasStore()

  useEffect(() => {
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      if (!sourceNode || !targetNode) continue

      const sourceHandle = edge.sourceHandle
      const targetHandle = edge.targetHandle

      // 数据映射规则
      if (sourceNode.type === 'text' && targetNode.type === 'image' && targetHandle === 'prompt') {
        updateNodeData(targetNode.id, { prompt: sourceNode.data.content })
      }
      if (sourceNode.type === 'text' && targetNode.type === 'video' && targetHandle === 'prompt') {
        updateNodeData(targetNode.id, { prompt: sourceNode.data.content })
      }
      if (sourceNode.type === 'image' && targetNode.type === 'video') {
        if (targetHandle === 'firstFrame') {
          updateNodeData(targetNode.id, { firstFrameSrc: sourceNode.data.imageSrc })
        }
        if (targetHandle === 'lastFrame') {
          updateNodeData(targetNode.id, { lastFrameSrc: sourceNode.data.imageSrc })
        }
      }
    }
  }, [edges, nodes])
}
```

**验收**：连线建立后，源节点数据自动同步到目标节点

---

### Day 6：右键菜单 + 双击创建

#### Step 6.1 右键菜单

**文件**：`src/components/canvas/ContextMenu.tsx`

```tsx
import { useState, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '../../stores/canvasStore'

interface ContextMenuState {
  x: number
  y: number
  type: 'pane' | 'node' | 'edge'
  nodeId?: string
  edgeId?: string
}

export function ContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const reactFlow = useReactFlow()
  const { addNode, removeNodes, groupNodes, selectedNodeIds } = useCanvasStore()

  // 监听右键事件（在 Canvas 组件中注册）
  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      type: 'pane',
    })
  }, [])

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault()
    setMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeId: node.id,
    })
  }, [])

  if (!menu) return null

  const nodeTypes = [
    { type: 'text', label: '📝 文本节点', color: '#8b5cf6' },
    { type: 'image', label: '🖼️ 图片节点', color: '#06b6d4' },
    { type: 'video', label: '🎥 视频节点', color: '#f43f5e' },
    { type: 'audio', label: '🎵 音频节点', color: '#22c55e' },
    { type: 'script', label: '🎬 脚本节点', color: '#f59e0b' },
  ]

  return (
    <div
      className="fixed z-50 bg-[#16213e] border border-[#0f3460] rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: menu.x, top: menu.y }}
      onClick={() => setMenu(null)}
    >
      {menu.type === 'pane' && (
        <>
          <div className="px-3 py-1 text-xs text-gray-500">新建节点</div>
          {nodeTypes.map(nt => (
            <button
              key={nt.type}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#0f3460] flex items-center gap-2"
              onClick={() => {
                const position = reactFlow.screenToFlowPosition({ x: menu.x, y: menu.y })
                addNode({
                  id: `${nt.type}-${Date.now()}`,
                  type: nt.type,
                  position,
                  data: {},
                })
              }}
            >
              {nt.label}
            </button>
          ))}
        </>
      )}
      {menu.type === 'node' && (
        <>
          <button className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#0f3460]"
            onClick={() => { /* 复制逻辑 */ }}>
            📋 复制
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#0f3460]"
            onClick={() => { if (menu.nodeId) removeNodes([menu.nodeId]) }}>
            🗑️ 删除
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#0f3460]"
            onClick={() => { if (selectedNodeIds.length > 1) groupNodes(selectedNodeIds) }}>
            📦 打组
          </button>
        </>
      )}
    </div>
  )
}
```

---

### Day 7：左侧栏

#### Step 7.1 侧栏组件

**文件**：`src/components/sidebar/Sidebar.tsx`

```tsx
import { useState } from 'react'
import { NodePanel } from './NodePanel'
import { ToolPanel } from './ToolPanel'
import { AssetPanel } from './AssetPanel'
import { HistoryPanel } from './HistoryPanel'

const tabs = [
  { id: 'nodes', icon: '➕', label: '节点' },
  { id: 'tools', icon: '🔧', label: '工具' },
  { id: 'assets', icon: '📁', label: '资产' },
  { id: 'history', icon: '📜', label: '历史' },
] as const

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<string>('nodes')
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex h-full">
      {/* 图标栏 */}
      <div className="w-14 bg-[#0f3460] flex flex-col items-center py-4 gap-4 border-r border-[#16213e]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setIsExpanded(true)
            }}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition
              ${activeTab === tab.id ? 'bg-[#6366f1] text-white' : 'text-gray-400 hover:bg-[#16213e]'}`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[8px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 展开面板 */}
      {isExpanded && (
        <div className="w-52 bg-[#16213e] border-r border-[#0f3460] overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-[#0f3460]">
            <span className="text-xs font-medium text-gray-300">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-white text-sm">
              ✕
            </button>
          </div>

          {activeTab === 'nodes' && <NodePanel />}
          {activeTab === 'tools' && <ToolPanel />}
          {activeTab === 'assets' && <AssetPanel />}
          {activeTab === 'history' && <HistoryPanel />}
        </div>
      )}
    </div>
  )
}
```

---

### Day 8-9：项目存取 + 启动页

#### Step 8.1 启动页

**文件**：`src/components/project/StartPage.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/projectStore'

export function StartPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.project.list().then(setProjects)
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const project = await window.api.project.create(newName.trim())
    onOpenProject(project.id)
  }

  return (
    <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
      <div className="w-[600px]">
        <h1 className="text-3xl font-bold text-white mb-2">LocalCanvas</h1>
        <p className="text-gray-400 mb-8">本地 AI 视频创作画布</p>

        {/* 新建项目 */}
        <div className="flex gap-2 mb-8">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入项目名称..."
            className="flex-1 bg-[#16213e] text-white px-4 py-2 rounded-lg outline-none border border-[#0f3460] focus:border-[#6366f1]"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="bg-[#6366f1] text-white px-6 py-2 rounded-lg hover:bg-[#5254d4] transition"
          >
            新建项目
          </button>
        </div>

        {/* 最近项目 */}
        <h2 className="text-sm text-gray-400 mb-3">最近项目</h2>
        <div className="grid grid-cols-2 gap-3">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="bg-[#16213e] p-4 rounded-lg border border-[#0f3460] hover:border-[#6366f1] cursor-pointer transition"
            >
              <div className="text-white text-sm font-medium">{p.name}</div>
              <div className="text-gray-500 text-xs mt-1">
                {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            还没有项目，创建一个开始吧 🚀
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Day 10：自动保存 + 文件拖入 + 主题

#### Step 10.1 自动保存 Hook

**文件**：`src/hooks/useAutoSave.ts`

```typescript
import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useProjectStore } from '../stores/projectStore'

export function useAutoSave() {
  const { nodes, edges, viewport } = useCanvasStore()
  const { currentProjectId, isDirty } = useProjectStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!currentProjectId || !isDirty) return

    // 30s debounce 自动保存
    timerRef.current = setTimeout(() => {
      const projectData = {
        id: currentProjectId,
        nodes,
        edges,
        viewport,
        updatedAt: new Date().toISOString(),
      }
      window.api.project.save(JSON.stringify(projectData))
    }, 30000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes, edges, viewport, currentProjectId, isDirty])
}
```

#### Step 10.2 文件拖入到画布

**文件**：`src/hooks/useFileDrop.ts`

```typescript
import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '../stores/canvasStore'

export function useFileDrop() {
  const reactFlow = useReactFlow()
  const addNode = useCanvasStore(s => s.addNode)

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    const files = event.dataTransfer.files
    if (files.length === 0) return

    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const offset = i * 40
      let nodeType: string | null = null

      if (file.type.startsWith('image/')) nodeType = 'image'
      else if (file.type.startsWith('video/')) nodeType = 'video'
      else if (file.type.startsWith('audio/')) nodeType = 'audio'

      if (nodeType) {
        const url = URL.createObjectURL(file)
        const dataKey = nodeType === 'image' ? 'imageSrc' : nodeType === 'video' ? 'videoSrc' : 'audioSrc'

        addNode({
          id: `${nodeType}-${Date.now()}-${i}`,
          type: nodeType,
          position: { x: position.x + offset, y: position.y + offset },
          data: { [dataKey]: url, fileName: file.name },
        })
      }
    }
  }, [reactFlow, addNode])

  return { onDragOver, onDrop }
}
```

#### Step 10.3 深色主题 CSS

**文件**：`src/styles/theme.css`

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #ffffff;
  --text-secondary: #a0aec0;
  --text-muted: #718096;
  --accent: #6366f1;
  --accent-hover: #5254d4;
  --border: #0f3460;
  --node-text: #8b5cf6;
  --node-image: #06b6d4;
  --node-video: #f43f5e;
  --node-audio: #22c55e;
  --node-script: #f59e0b;
  --danger: #ef4444;
  --success: #22c55e;
}
```

---

## 五、数据结构设计

### 5.1 TypeScript 类型

**文件**：`src/types/node.ts`

```typescript
import type { Node, Edge } from '@xyflow/react'

// 节点类型枚举
export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'script'

// 文本节点数据
export interface TextNodeData {
  content: string
  llmModel?: string
}

// 图片节点数据
export interface ImageNodeData {
  imageSrc?: string
  fileName?: string
  prompt?: string
  negativePrompt?: string
  modelId?: string
  ratio?: string
  referenceImageIds?: string[]
  isGenerating?: boolean
  progress?: number
}

// 视频节点数据
export interface VideoNodeData {
  videoSrc?: string
  fileName?: string
  prompt?: string
  modelId?: string
  duration?: number
  firstFrameSrc?: string
  lastFrameSrc?: string
  camera?: string
  isGenerating?: boolean
  progress?: number
}

// 音频节点数据
export interface AudioNodeData {
  audioSrc?: string
  fileName?: string
}

// 脚本节点数据
export interface ScriptNodeData {
  storyInput?: string
  scriptRows?: ScriptRow[]
  imageModelId?: string
  videoModelId?: string
}

export interface ScriptRow {
  id: string
  sequence: number
  description: string
  prompt: string
  duration: number
  camera: string
}

// 联合类型
export type CanvasNodeData =
  | { type: 'text'; data: TextNodeData }
  | { type: 'image'; data: ImageNodeData }
  | { type: 'video'; data: VideoNodeData }
  | { type: 'audio'; data: AudioNodeData }
  | { type: 'script'; data: ScriptNodeData }

// 端口类型
export type PortType =
  | 'prompt'
  | 'reference'
  | 'firstFrame'
  | 'lastFrame'
  | 'audio'
  | 'video'
  | 'data'
  | 'script'
```

---

## 六、快捷键总览（v1）

| 操作 | Windows / Linux | Mac |
|------|-----------------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
| 框选 | 鼠标拖拽空白处 | 鼠标拖拽空白处 |
| 平移画布 | 空格+拖拽 / 中键拖拽 | 空格+拖拽 / 中键拖拽 |
| 缩放 | Ctrl+滚轮 | Cmd+滚轮 |
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Shift+Z | Cmd+Shift+Z |
| 打组 | Ctrl+G | Cmd+G |
| 删除 | Delete / Backspace | Delete / Backspace |
| 复制 | Ctrl+C | Cmd+C |
| 粘贴 | Ctrl+V | Cmd+V |
| 全选 | Ctrl+A | Cmd+A |
| 保存项目 | Ctrl+S | Cmd+S |

---

## 七、测试要点

| 测试场景 | 操作 | 预期结果 |
|----------|------|----------|
| 应用启动 | 运行 `npm run dev` | 显示启动页，无报错 |
| 创建项目 | 输入名称 → 点击新建 | 跳转到空白画布 |
| 创建节点 | 双击空白 → 选择类型 | 对应节点出现在画布 |
| 拖入节点 | 从左侧栏拖到画布 | 节点在释放位置创建 |
| 拖入文件 | 拖入图片到画布 | 自动创建图片节点 |
| 节点连线 | 从端口拖到另一端口 | 连线建立，数据传递 |
| 打组 | 框选多节点 → Ctrl+G | 组创建成功 |
| 撤销 | Ctrl+Z | 上一步操作被撤销 |
| 项目保存 | 修改后等待 30s | 自动保存，重新打开数据完整 |
| 缩放 | 滚轮缩放 | 0.1x-4x 范围内平滑缩放 |
| 小地图 | 拖拽小地图 | 画布视口跟随移动 |

---

## 八、v1 验收标准

> **验收日期**：2026-06-04（与代码实现对齐）

- [x] 应用可启动，显示项目列表页
- [x] 可创建/打开/删除项目（SQLite 存储）
- [x] 画布支持无限缩放（0.1x-4x）/平移/小地图导航
- [x] 5 种节点可通过双击/拖入/右键创建
- [x] 节点显示正确（标题/内容/端口）
- [x] 图片/视频/音频节点支持文件上传（写入 `projects/{id}/assets/`，节点存相对路径）
- [x] 节点之间可连线（仅允许合法端口组合）
- [x] 连线后数据正确传递（文本/脚本→提示词、图片→参考/首帧/尾帧、音频→视频）
- [x] Ctrl+G 打组成功（`nodes` + `groups` 表同步持久化）
- [x] Ctrl+Z 撤销、Ctrl+Shift+Z 重做正常
- [x] 右键菜单功能完整（含「保存为工作流」→ `workflows/*.json`）
- [x] 项目自动保存（30s + 窗口失焦，写入 SQLite）
- [x] 深色主题统一（CSS Variables）
- [x] 拖入文件可自动创建对应节点
- [x] 日志系统正常输出（electron-log）
- [x] 核心工具模块单测覆盖率 ≥ 80%（`npm run test:coverage`，覆盖 `projectPayload` / `dataFlow` / `workflow` / `portCompat`）
- [x] 错误处理框架正常工作（`ErrorHandler` + Toast 提示）

**未纳入 v1 验收（后续版本）**

- [ ] 关闭窗口前未保存变更提示（§1.1.3）
- [ ] 视频节点首帧缩略图与独立预览弹窗
- [ ] 左侧栏工具箱 / 资产 / 历史面板实质功能
- [ ] Zustand 三层 Store 拆分、`IRepository` 抽象（§九架构增强，可渐进）
- [ ] `ComposeNode` 占位组件

---

## 九、架构增强补充

> 以下为根据项目评审补充的架构改进，贯穿 v1 开发全流程。

### 9.1 状态管理分层

原 `canvasStore` 职责过重（同时管理域数据 + UI 状态 + 异步状态），拆分为三层：

```typescript
// ─── Domain State（域数据，可持久化到 SQLite）───
// stores/domain/canvasDomainStore.ts
interface CanvasDomainState {
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
  // Actions
  addNode: (node: Node) => void
  removeNodes: (ids: string[]) => void
  updateNodeData: (id: string, data: Partial<NodeData>) => void
  addEdge: (edge: Edge) => void
  removeEdges: (ids: string[]) => void
  setViewport: (viewport: Viewport) => void
}

// ─── UI State（UI 临时状态，不持久化）───
// stores/ui/canvasUIStore.ts
interface CanvasUIState {
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  activePanel: 'none' | 'generator' | 'timeline' | 'settings'
  isSidebarOpen: boolean
  contextMenu: { x: number; y: number; items: MenuItem[] } | null
  // Actions
  setSelectedNodes: (ids: string[]) => void
  setContextMenu: (menu: CanvasUIState['contextMenu']) => void
}

// ─── Async State（异步操作状态）───
// stores/async/canvasAsyncStore.ts
interface CanvasAsyncState {
  isSaving: boolean
  isLoading: boolean
  saveError: string | null
  lastSavedAt: string | null
  // Actions
  startSave: () => void
  finishSave: () => void
  failSave: (error: string) => void
}
```

### 9.2 TypeScript 类型集中管理

所有共享类型集中到 `@localcanvas/types` 包，避免各模块重复定义：

```
packages/
└── types/
    ├── src/
    │   ├── node.ts        # NodeType, NodeData, Port, PortType
    │   ├── edge.ts        # Edge, EdgeType
    │   ├── project.ts     # Project, Viewport
    │   ├── model.ts       # ModelConfig, AdapterType
    │   ├── generation.ts  # Generation, GenerationStatus
    │   ├── ipc.ts         # IPC 通道类型定义
    │   └── index.ts       # 统一导出
    ├── package.json
    └── tsconfig.json
```

使用方式：`import type { NodeType, NodeData } from '@localcanvas/types'`

### 9.3 自动化测试策略

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/stores/**', 'src/utils/**', 'electron/main/services/**'],
      thresholds: { lines: 80, branches: 70 },
    },
  },
})
```

**测试分层**：

| 层 | 框架 | 覆盖范围 | v1 目标 |
|---|------|---------|--------|
| 单元测试 | Vitest | stores / utils / services | 80%+ |
| 组件测试 | Vitest + @testing-library/react | 节点组件 / 面板 | 核心组件 |
| E2E 测试 | Playwright（v3 引入） | 完整用户流程 | v1 不做 |

### 9.4 日志系统

```typescript
// electron/main/services/logger.ts
import log from 'electron-log/main'

log.initialize()
log.transports.file.resolvePathFn = () => {
  return join(app.getPath('userData'), 'logs', 'main.log')
}

export const logger = log.scope('main')

// Renderer 端通过 IPC 转发日志
// preload: logger.renderLoggerBridge(ipcRenderer)
```

日志级别策略：开发环境 `debug`，生产环境 `info`，错误日志始终 `error` 级别写入文件。

### 9.5 错误处理框架

```typescript
// src/utils/ErrorHandler.ts
export enum ErrorCategory {
  NETWORK = 'network',
  MODEL_API = 'model_api',
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  FFMPEG = 'ffmpeg',
  UNKNOWN = 'unknown',
}

export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public userMessage: string,    // 用户可见的友好提示
    public retryable: boolean = false,
    public cause?: Error
  ) {
    super(message)
  }
}

// 统一错误处理器
export function handleError(error: unknown, context?: string): void {
  if (error instanceof AppError) {
    logger.error(`[${error.category}] ${error.message}`, { context })
    toast.error(error.userMessage)
    if (error.retryable) { /* 显示重试按钮 */ }
  } else {
    logger.error('Unhandled error', error)
    toast.error('操作失败，请重试')
  }
}
```

### 9.6 i18n 基础设施（v1 预留接口）

```typescript
// src/i18n/index.ts
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'

i18next.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zhCN } },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
})

// 使用方式：const t = useTranslation(); t('canvas.newProject')
// v1 仅中文，但所有用户可见文字必须通过 t() 函数，不可硬编码
```

### 9.7 CSS Variables / 设计令牌

v1 文档中大量硬编码色值（如 `bg-[#0f3460]`、`bg-[#16213e]`、`bg-[#6366f1]`），**实际开发时**应统一替换为 CSS Variables：

```css
/* src/styles/tokens.css — 设计令牌 */
:root {
  --color-bg-primary: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-bg-tertiary: #0f3460;
  --color-accent: #6366f1;
  --color-accent-hover: #5254d4;
  --color-border: #0f3460;
}
```

```tsx
// 替换前: <div className="bg-[#0f3460]">
// 替换后: <div className="bg-[var(--color-bg-tertiary)]">
```

或通过 Tailwind 扩展主题：
```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'bg-primary': 'var(--color-bg-primary)',
      'bg-secondary': 'var(--color-bg-secondary)',
      'bg-tertiary': 'var(--color-bg-tertiary)',
      'accent': 'var(--color-accent)',
    }
  }
}
```

---

## 九、v1 → v2 衔接说明

v1 完成后，应用具备完整的画布交互能力，但所有「生成」按钮均为灰色不可用。v2 将接入模型配置系统和适配器，让画布真正「活」起来：

| v1 留口 | v2 接入 |
|---------|---------|
| 图片节点「生成 (v2)」按钮 | 接入图像生成器面板 |
| 视频节点「生成 (v2)」按钮 | 接入视频生成器面板 |
| 脚本节点「生成脚本 (v2)」按钮 | 接入 LLM 服务 |
| 脚本节点「生成分镜图 (v2)」按钮 | 接入批量图像生成 |
| 脚本节点「生成视频 (v2)」按钮 | 接入批量视频生成 |
| 无模型配置 | 接入 config.yaml + 设置面板 |
| 无生成进度显示 | 接入 WebSocket 进度推送 |

---

## 十、全版本文档索引

| 版本 | 文档 |
|------|------|
| v1 | 本文档 |
| v2 | [LocalCanvas_v2_模型配置与生成器系统.md](./LocalCanvas_v2_模型配置与生成器系统.md) |
| v3 | [LocalCanvas_v3_视频合成与项目打磨.md](./LocalCanvas_v3_视频合成与项目打磨.md) |
| v4 | [LocalCanvas_v4_完善高级功能与发布.md](./LocalCanvas_v4_完善高级功能与发布.md) |
| v5 | [LocalCanvas_v5_Agent自动化与分镜增强.md](./LocalCanvas_v5_Agent自动化与分镜增强.md) |
| v6 客户端 | [LocalCanvas_v6_节点体验与能力系统.md](./LocalCanvas_v6_节点体验与能力系统.md) |
| 开发步骤总表 | [LocalCanvas_开发步骤表.md](./LocalCanvas_开发步骤表.md) |

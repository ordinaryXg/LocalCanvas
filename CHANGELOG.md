# Changelog

All notable changes to LocalCanvas are documented in this file.

## [Unreleased]

### Added

- **v9 Wave 1–3（收官）** — 死代码清理、`React.lazy` 分包、React Flow 可见区渲染、DAG 重试/跳过/并发、`dagRunStore` 全局状态
- **分镜** — 「同步到画布」、批量重生视频
- **账号** — `UserProfilePanel`（昵称/邮箱）
- **合成** — `audioVolume` 传入 FFmpeg 混流；导出中「取消」按钮接线 `compose:cancel`
- **Agent** — 会话历史列表 + `agent:getSession` IPC；`AgentPanel` 历史/新对话
- **端口** — 槽位计数 `n/max`（`port-slot-labels.ts`）
- **视频生成** — `StylePresetChips` 对齐图片风格选择
- **启动页** — 模板 chip 预置工作流节点图
- **GenerateMode** — 右侧生成历史侧栏
- **测试** — `port-slot-labels.test.ts`、`authValidation.test.ts`；e2e `dag-smoke`、`storyboard-export`
- **v8 EditorShell** — TopBar、Dock、Inspector、三模式（canvas / generate / edit）、经典布局开关
- **GeneratorDrawer** — 底部可拖拽高度抽屉，替代居中 GeneratorPanel；顶栏动态标题与「生成」按钮
- **ImageEditorPanel** — 左预览 / 右参数 / 底 prompt；`CurrentImagePreview`、`StylePresetChips`、`ResizablePreviewPane`
- **节点命名** — 新建/复制节点自动递增标题（「图片 1」「文本 2」…）；双击节点标题可编辑
- **图片风格体验** — chip 选择 + 生效 prompt 预览；`/style` 打开 Drawer 并高亮风格行；节点 badge 显示风格名
- **recentOutputs** — 图片节点最近 3 次生成缩略切换
- **Inspector 增强** — 按节点类型展示模型、风格、连线警告等详情
- Generation history panel with reuse, delete, thumbnails, and stats
- Workflow templates (presets) with import/export and custom workflow delete
- Replicate and Custom HTTP model presets in Settings
- SQLite `task_queue` schema in main database with crash recovery respecting `max_retries`
- Batch generation history tracking via `model:batchItemComplete`
- Active project sync for generation history `project_id`
- Disk space checks before compose, adapter output writes, and asset imports
- i18n error messages for adapter error codes
- Retry-After header support in utility retry manager
- Auto-update via electron-updater and GitHub Actions CI build workflow

### Fixed

- **GeneratorDrawer** — 节点 `isGenerating` 时点击外部不关闭
- **Maximum update depth exceeded** — `useModelGeneration` 的 `onProgress` 改 ref
- **上游断开 prompt 残留** — `dataFlow` 在图片/视频节点无 `prompt` 入边时清除 `prompt`
- History reuse now imports media via `importGeneratedMedia` with correct node fields (`imageSrc`, `videoSrc`, etc.)
- Compose service output rename regression

### Documentation

- `docs/v8/design/LocalCanvas_图片节点与生成器重设计.md` — Phase 0–2 实施记录
- `docs/LocalCanvas_v8_界面与体验重设计.md` — 实施进度表
- `docs/workflow-templates.md` — preset workflow guide
- `docs/quick-start.md`, `docs/model-config.md` — HTTP API model configuration

## [0.1.0] — MVP

- Canvas editor with text/image/video/audio/script/compose nodes
- Project save/load with SQLite persistence
- Seedream / Seedance remote API adapters
- FFmpeg trim and video compose

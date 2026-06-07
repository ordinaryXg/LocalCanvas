# Changelog

All notable changes to LocalCanvas are documented in this file.

## [Unreleased]

### Added

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

- **Maximum update depth exceeded** — `useModelGeneration` 的 `onProgress` 改 ref；`generatorHeaderStore` 跳过无变化更新
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

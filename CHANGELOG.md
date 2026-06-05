# Changelog

All notable changes to LocalCanvas are documented in this file.

## [Unreleased]

### Added

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

- History reuse now imports media via `importGeneratedMedia` with correct node fields (`imageSrc`, `videoSrc`, etc.)
- Compose service output rename regression

### Documentation

- `docs/workflow-templates.md` — preset workflow guide
- `docs/quick-start.md`, `docs/model-config.md` — HTTP API model configuration

## [0.1.0] — MVP

- Canvas editor with text/image/video/audio/script/compose nodes
- Project save/load with SQLite persistence
- Seedream / Seedance remote API adapters
- FFmpeg trim and video compose

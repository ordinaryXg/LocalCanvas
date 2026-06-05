# LocalCanvas v7 — 概念深挖与探针索引（落地版）

> **上级文档**：[LocalCanvas_v7_创作连续体与意图场.md](../../LocalCanvas_v7_创作连续体与意图场.md)  
> **文档版本**：v2 — 增补界面规范、分阶段实现、代码挂接、验收用例  
> **代码基线**：`main` @ Electron 33 / React 19 / React Flow 12 / better-sqlite3

---

## 每份探针的章节结构（v2）

| 章 | 内容 |
|----|------|
| **0** | 概念锚点、落地原型边界、非目标 |
| **1** | 用户旅程（分步时序） |
| **2** | 界面设计规范（布局、尺寸、色板、动效、组件树） |
| **3** | 状态机与异常态 |
| **4** | 数据模型与迁移 |
| **5** | 实现路线图（Phase 0–N，按天） |
| **6** | 代码挂接清单（现有文件 + 新增文件 + IPC） |
| **7** | 测试用例与验收标准 |
| **8** | 依赖、风险、降级 |

---

## 概念 ↔ 探针 ↔ 实验 ↔ 工期

| # | 概念 | 文档 | 实验 | Phase 0 MVP | 完整版 |
|---|------|------|------|-------------|--------|
| 12 | 引擎地下室 | [12](./12_引擎地下室_投影编译.md) | — | 3d | 5d |
| 01 | 液态创作 | [01](./01_液态创作_流体状态.md) | — | 2d | 4d |
| 02 | 共鸣场 | [02](./02_共鸣场_调谐盘.md) | E1 | 3d | 6d |
| 09 | 屏息 | [09](./09_屏息_吸气屏息呼气.md) | E5 | 2d | 3d |
| 08 | 共生预演 | [08](./08_共生预演_幽灵预览.md) | E5 | 3d | 5d |
| 04 | 情感地形 | [04](./04_情感地形_可行走地图.md) | E3 | 3d | 6d |
| 03 | 叠加态 | [03](./03_叠加态镜头_鬼影池.md) | E2 | 3d | 5d |
| 07 | 负熵创作 | [07](./07_负熵创作_减法雕刻.md) | E4 | 2d | 5d |
| 05 | 隐迹记忆 | [05](./05_隐迹记忆_考古层.md) | E6 | 3d | 5d |
| 06 | 内在合唱团 | [06](./06_内在合唱团_声部合议.md) | — | 3d | 5d |
| 10 | 结晶 | [10](./10_结晶_流体冻结导出.md) | E7 | 2d | 4d |
| 11 | 创作相位 UI | [11](./11_创作相位_界面变形.md) | — | 2d | 4d |

**推荐实现顺序**：12 → 01 → 02 → 09 → 08 → 04 → 03 → 07 → 05 → 06 → 10 → 11

---

## 全局基础设施（所有探针共用）

### Feature Flag

```typescript
// src/constants/fluidFeatures.ts
export const FLUID_UI = import.meta.env.VITE_FLUID_UI === '1'
export const FLUID_RESONANCE = import.meta.env.VITE_FLUID_RESONANCE === '1'
export const FLUID_PROBE = import.meta.env.VITE_FLUID_PROBE === '1'
```

`.env.development` 示例：`VITE_FLUID_UI=1`

### 数据库迁移

在 `electron/main/database/index.ts` 新增 `migrateV7FluidSchema(db)`：

```sql
-- 见各探针 §4；统一在 v7 迁移中 CREATE IF NOT EXISTS
fluid_state, resonance_sources, shot_candidates, shot_slot_bindings,
affect_envelope, palimpsest_layers, chorus_sessions, probe_budget,
crystallization_snapshots, fluid_events
```

### Preload 扩展模式

```javascript
// electron/preload/index.cjs — 按域挂载
fluid: { getState, patchState, listEvents },
resonance: { list, create, patch, delete, compilePrompt },
superposed: { list, append, collapse, archive },
// ...
```

### 共享类型

```
src/types/fluid.ts          — 用户层 TS 类型（与 main 共享 via 复制或 electron-vite alias）
electron/utility/types/fluid.ts
```

### 事件总线（Renderer）

```typescript
// src/lib/fluidBus.ts
type FluidEvent =
  | { type: 'resonance:patched'; projectId: string }
  | { type: 'breath:phase'; phase: BreathPhase }
  | { type: 'superposed:appended'; shotSlotId: string }
export const fluidBus = new EventTarget()
```

探针间通过 `fluidBus` 解耦，避免 store 循环依赖。

### 媒体目录约定

| 路径 | 用途 |
|------|------|
| `{project}/assets/` | 正式生成物 |
| `{project}/assets/.probe/` | 幽灵预览低分图 |
| `{project}/assets/.thumbs/` | 候选缩略图 160px |
| `{project}/fluid/` | 可选 JSON 快照备份 |

### Telemetry（本地 SQLite `fluid_events`）

```sql
CREATE TABLE fluid_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
```

用于 E1–E7 行为验收：`tuning_orbit_drag`, `negentropy_apply`, `video_regenerate` 等。

---

## 与现有模块对照表

| 现有模块 | v7 探针用法 |
|----------|-------------|
| `canvasStore` | 引擎层真相；`compileDown` 写入 |
| `projectStore.currentProjectId` | 所有 IPC 第一参数 |
| `ImageGenerator.handleGenerate` | 注入 `compilePrompt` 钩子 |
| `VideoGenerator.handleGenerate` | 同上 + `superposed.append` |
| `ComposeExportDrawer` | 探针 10 包装 |
| `AgentPanel` + `agent:chat` | 探针 06 合唱团 |
| `history:query` | 探针 05 拒绝归档扩展 |
| `assertNoWarnEdgesForNode` | 编译后仍走能力 guard |
| `importGeneratedMedia` | 候选/幽灵落盘复用 |

---

## 探针独立验收原则

每个探针必须满足：

1. **可单独开关** — 对应 `VITE_FLUID_*` 或设置项  
2. **可单独演示** — 15 分钟内完成一条 happy path  
3. **不破坏引擎模式** — `FLUID_UI=0` 时行为与 v6 一致  
4. **有自动化测试** — 至少 1 个纯函数单测 + 1 条 IPC 集成测试（如适用）

---

*各探针文档为实施唯一细节来源；冲突时以编号更大的基础设施探针（12）为准。*

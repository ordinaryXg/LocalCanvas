# LocalCanvas 合成编辑器重设计

> **目标**：让合成编辑器用起来更像视频剪辑软件，同时保持 LocalCanvas「节点工作流 + 轻量剪辑」的定位  
> **原则**：简洁、直觉、少选项；高级能力收进二级入口  
> **日期**：2026-06-05  
> **状态**：✅ 已实施（v2 剪辑台）

---

## 一、设计定位

### 1.1 我们是什么 / 不是什么

| 是 | 不是 |
|----|------|
| AI 工作流最后一环的**轻量剪辑台** | Premiere / DaVinci 级专业 NLE |
| 多片段**顺序拼接 + 配乐 + 字幕** | 多机位、调色、特效、关键帧 |
| 从画布节点**汇入素材、导出成片** | 独立项目管理、素材库管理 |

### 1.2 核心用户路径（80% 场景）

```
画布连线（视频×N + 音频） → 打开剪辑台 → 调整顺序/裁切 → 预览 → 导出 MP4 → 自动挂到画布
```

### 1.3 设计原则

1. **一屏三区**：预览在上、时间轴在下、工具栏极简
2. **时间轴即素材列表**：去掉与轨道重复的片段清单 UI
3. **默认顺序模式**：片段首尾相接、不可重叠
4. **选中才显示细节**：检查器仅在选中片段/音轨时展开
5. **画布与剪辑台分工**：画布管生成与连线，剪辑台管排列与导出

---

## 二、评审结论（已采纳）

| 问题 | 决策 | 实现方式 |
|------|------|----------|
| 剪辑台是否默认全屏？ | **默认大面板 75% 高**，保留画布可见；提供「专注模式」一键全屏 | `ComposeEditor` 默认 `height: 75%`；顶栏「专注模式」切换 `focusMode` |
| 删除时间轴片段是否断开连线？ | **默认仅 `excluded`**；右键可选「断开连线」 | `Delete` / 右键「从成片排除」；右键「断开连线」调用 `removeEdge` |
| 多视频输入口是否保留？ | **保留并动态扩展**；时间轴单轨顺序排列 | `requiredVideoInputCount()` 最少 3 口，按连线数扩展；`portCompat` 支持 `videoN` |

---

## 三、目标体验

### 3.1 布局（剪辑台模式）

选中合成节点后自动打开剪辑台（可点 ✕ 收起，节点上「打开剪辑台」可再次进入）。

```
┌─────────────────────────────────────────────────────────────────┐
│  🎞️ 合成 · 3 片段 · 00:42    [字幕] [专注模式] [···] [导出▶] [✕] │
├─────────────────────────────────────────────────────────────────┤
│  预览区（可拖拽拉高） + 播放控制 ⏮ ▶ ⏭  时间码                    │
├─────────────────────────────────────────────────────────────────┤
│  字幕轨 / 视频轨 / 音频轨 / 播放指针                               │
├─────────────────────────────────────────────────────────────────┤
│  检查器（选中片段或音轨时，右侧 240px）                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 与画布的关系

- **汇入**：`dataFlow.ts` 连线变更 → 同步 `clips`（保留 `trimIn` / `excluded`）
- **编修**：顺序、裁切、音量、字幕均在剪辑台完成
- **导出**：`runCompose` → `finishComposeAndCreateVideoNode`（行为与旧版一致）

---

## 四、功能设计

### 4.1 时间轴

| 轨道 | 说明 |
|------|------|
| 字幕轨 | 导入 SRT 后显示；无字幕时一行提示 |
| 视频轨 | 所有片段顺序排列，拖拽调序 |
| 音频轨 | 单条背景音乐 |

| 操作 | 方式 |
|------|------|
| 调整顺序 | 拖拽片段（顺序模式自动重算 `startTime`） |
| 裁切 | 拖拽片段左右边缘，或检查器输入入点/出点 |
| 选中 | 单击片段 → 检查器 + seek |
| 排除 | `Delete` 或右键「从成片排除」 |
| 断开连线 | 右键「断开连线」 |
| 缩放 | 时间轴工具栏滑块 30–120 px/s |

### 4.2 预览与播放

- 空格：播放/暂停
- `←` / `→`：±0.1s
- `Home` / `End`：开头/结尾
- 预览区底部拖拽条调整高度

### 4.3 导出

- 顶栏「导出 ▶」为唯一主 CTA
- 「···」打开导出设置：强制重编码、烧录硬字幕

### 4.4 合成节点（画布）

- 片段数 / 总时长摘要
- 「打开剪辑台」按钮
- 上次导出状态
- 已移除：节点内片段列表、快速合成

---

## 五、数据模型

```ts
interface ComposeClipItem {
  id: string
  sourceNodeId?: string
  name?: string
  assetPath?: string
  absolutePath?: string
  trimIn?: number        // 默认 0
  duration: number
  sourceDuration?: number
  startTime?: number     // 顺序模式引擎计算
  excluded?: boolean
  thumbnailPath?: string
}

interface ComposeNodeData {
  clips?: ComposeClipItem[]
  audioAssetPath?: string
  audioVolume?: number   // 0–1，UI 已支持
  subtitleCues?: SubtitleCue[]
  subtitlePath?: string
  burnSubtitles?: boolean
  outputPath?: string
  editorLayout?: { previewHeight?, pixelsPerSecond? }
}
```

导出时：`trimIn` + `duration` → `compose-service` 先 `trimVideo` 再 `concat`。

---

## 六、组件结构（已实现）

```
src/components/compose/
├── ComposeEditor.tsx          # 剪辑台根容器
├── ComposeToolbar.tsx         # 顶栏
├── ComposePreview.tsx         # 预览 + 传输控制
├── ComposeInspector.tsx       # 右侧检查器
├── ComposeTimeline.tsx        # 时间轴
├── ComposeClipBlock.tsx       # 片段块（拖拽/裁切/缩略图）
├── ComposeSubtitleLane.tsx    # 字幕轨
└── ComposeExportDrawer.tsx    # 导出设置

src/stores/composeEditorStore.ts
src/hooks/useComposePlayback.ts
src/utils/composeSequence.ts
```

**挂载**：`Canvas.tsx` 内，`GeneratorPanel` 同级；选中 `compose` 节点自动 `open()`。

**已删除**：`ComposeGenerator.tsx`（底部窄面板方案）。

---

## 七、实施清单

### Phase 1 — 剪辑台骨架 ✅

- [x] 合成节点选中 → `ComposeEditor` 大面板（75% 高）
- [x] 三区布局：预览 + 传输控制 + 时间轴
- [x] 顺序模式时间轴：拖拽排序、片段选中
- [x] 播放/暂停 + 指针联动
- [x] 单一导出入口
- [x] 移除重复片段列表 UI

### Phase 2 — 裁切与检查器 ✅

- [x] 片段左右边缘拖拽裁切
- [x] 右侧检查器：名称、入出点、时长、跳转源节点
- [x] 时间轴片段缩略图（`asset.thumbnail`）
- [x] 音频轨音量滑块（数据持久化；FFmpeg 混流音量滤镜待后续）

### Phase 3 — 体验打磨 ✅

- [x] 导出设置抽屉（重编码、烧录字幕）
- [x] 字幕轨可视化与预览叠加
- [x] 时间轴缩放、吸附开关
- [x] 专注模式（全屏）/ 显示画布切换
- [x] 空状态引导文案

### 明确不做（未变更）

- 多视频轨 / 画中画
- 转场特效、滤镜、变速
- 关键帧、蒙版

---

## 八、成功标准对照

| 标准 | 状态 |
|------|------|
| 5 分钟内完成连线→排序→导出 | ✅ 流程已打通 |
| 预览区高度 ≥ 40% 可视区域 | ✅ 默认 75% 面板 + 可调预览高度 |
| 主界面常驻控件 ≤ 5 个 | ✅ 顶栏精简 |
| 片段列表仅时间轴一处 | ✅ |
| 存量项目兼容 | ✅ `trimIn`/`excluded` 可选字段，旧数据默认可用 |

---

## 九、后续可选优化

1. FFmpeg 混流时应用 `audioVolume`（`-filter:a volume=`）
2. 导出进度取消按钮（`compose:cancel` 已有 IPC）
3. 排除片段在时间轴灰色展示并可「恢复至成片」（已实现右键）
4. 音频淡入淡出（设计二期项）

---

*本文档为合成编辑器 v2 交互基线与实施记录。代码入口：`ComposeEditor.tsx`、`composeSequence.ts`、`dataFlow.ts`（compose 段）、`compose-service.ts`（trim 预处理）。V6 总览见 [LocalCanvas_v6_节点体验与能力系统.md](../LocalCanvas_v6_节点体验与能力系统.md)。*

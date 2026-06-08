# Inspector 与 Generator Drawer 职责划分

> **目标**：消除右侧检查器与底部编辑面板之间的属性重复，建立全节点统一的「看状态 / 做编辑」语法  
> **原则**：Inspector = 选中对象的身份证与图上下文；Drawer = 唯一深度编辑与生成工作台  
> **日期**：2026-06-06  
> **状态**：✅ Wave A–C 已实施（2026-06-06）  
> **关联**：[v8 界面与体验重设计](../LocalCanvas_v8_界面与体验重设计.md)、[02 编辑器壳层与三模式布局](./02_编辑器壳层与三模式布局.md)、[图片节点与生成器重设计](./LocalCanvas_图片节点与生成器重设计.md)

---

## 一、问题诊断

v8 原设计意图：

- **Inspector** — 选中上下文 + 快捷入口
- **Generator Drawer** — 唯一深度编辑区

Phase 1 为丰富 Inspector，将大量**可编辑 / 生成参数**塞入右侧，与 Drawer 重复展示，用户不清楚「该在哪改」。

### 1.1 重复示例（图片节点，当前实现）

| 属性 | Inspector | Generator Drawer |
|------|-----------|------------------|
| 缩略图 / 预览 | ✅ 大图 | ✅ CurrentImagePreview |
| 模型 | ✅ 只读 | ✅ select |
| 风格 | ✅ 只读 | ✅ StylePresetChips |
| 比例 | ✅ 只读 | ✅ select |
| prompt | ✅ 4 行摘要 | ✅ 完整编辑 |
| 能力徽章 / 警告 | ✅ 完整 | ✅ 完整 |
| 生成进度 | ✅ 进度条 | ✅ 进度条 |
| 连线 | ✅ 列表 | ✅ 参考图区（部分） |

### 1.2 根因

| 根因 | 说明 |
|------|------|
| 职责边界未写死 | 02 专文 Inspector 矩阵偏概略，实现时按「信息越多越好」堆叠 |
| 无统一信息分层 | L2 状态与 L3 编辑字段未区分归属 |
| 各节点各自实现 | `ImageNodeDetails` 等组件未复用统一 Inspector 骨架 |

---

## 二、核心原则

> **Inspector 回答：「这是什么、连在哪、状态如何、下一步去哪？」**  
> **Drawer 回答：「具体内容是什么、用什么参数生成、现在就做。」**

| # | 原则 | Inspector | Generator Drawer |
|---|------|-----------|------------------|
| 1 | 节点 = 状态卡片 | 只读摘要 + 状态 chip | — |
| 2 | 面板 = 唯一编辑区 | 不提供表单控件 | 所有可编辑字段 |
| 3 | 一主一辅 | 窄栏、扫一眼 | 宽、可滚动、可拖拽高度 |
| 4 | 不重复媒体 | 小状态图或无图 | 大图 / 视频预览 |
| 5 | 图关系在 Inspector | 入边 / 出边拓扑 | 仅与编辑直接相关的入边（如 reference） |
| 6 | 阻断警告 Drawer 详述 | 摘要：「N 条连线问题」 | 完整原因 + 禁用生成 |

### 2.1 硬边界

**Inspector 永远不放：**

- model / ratio / style 等 select 或 chip 编辑控件
- prompt / draft 等 textarea
- 生成 / 取消按钮
- 完整生成进度条

**Drawer 永远不放：**

- 节点 id（debug 折叠除外）
- 画布坐标、节点宽高
- 完整入边 / 出边列表（reference 相关编辑区除外）
- 项目级摘要

---

## 三、空间架构

```
┌─────────────────────────────────────────────────────────────┐
│  画布节点（状态卡片）                                          │
│  · 最小可读信息：缩略图、一行摘要、状态角标                      │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  Inspector（右）      │    │  Generator Drawer（下）       │
│  「选中对象的身份证」  │    │  「当前节点的工作台」          │
│                      │    │                              │
│  · 身份与图上下文     │    │  · 内容编辑（prompt / 表格…） │
│  · 只读状态摘要       │    │  · 生成参数（模型 / 风格…）   │
│  · 拓扑（连线）       │    │  · 大预览 + 生成 / 取消       │
│  · 快捷动作入口       │    │  · 阻断级能力警告             │
│  · 画布 / 布局元数据  │    │                              │
└─────────────────────┘    └──────────────────────────────┘
```

---

## 四、信息分层模型

所有字段归为四层，决定面板归属：

| 层级 | 含义 | 归属 | 示例 |
|------|------|------|------|
| **L0 身份** | 节点是谁 | Inspector 可编辑 | `title`、`type`、`id`（折叠） |
| **L1 图上下文** | 在流程中的位置 | **仅 Inspector** | 入边 / 出边、上游节点名、DAG 依赖 |
| **L2 状态摘要** | 当前结果的只读快照 | Inspector 只读 | 「已生成」「生成中」「失败」、字数、帧数 |
| **L3 编辑与生成** | 用户要改 / 要跑的内容 | **仅 Drawer** | prompt、model、style、表格行、批量操作 |
| **L4 布局元数据** | 画布上的摆放 | Inspector 高级折叠 | `width×height`、`position` |

**规则：** L3 字段在 Inspector 中**不得**以表单或可编辑控件出现；最多 1 个只读 chip（如风格名）。需要详情必须打开 Drawer。

---

## 五、Inspector 统一结构（模板）

所有节点类型共用同一骨架：

```
┌─ 检查器 ─────────────────────┐
│ [●] 图片 · [可编辑标题]       │
│ id: image_xxx (折叠)         │
├─ 状态 ───────────────────────┤
│ [已生成] [电影感]            │  ← chip，只读
├─ 摘要 ───────────────────────┤
│ 文件 · cat_001.png           │  ← 最多 3 行
│ prompt ← 文本 2              │  ← 来源，非全文
├─ 连线 ───────────────────────┤
│ 入 · 文本 2 → prompt         │
│ 出 · 视频 1 ← image          │
├─ 健康 ───────────────────────┤
│ ⚠ 1 条能力警告 [查看]        │  ← 跳转 Drawer
├─ 动作 ───────────────────────┤
│ [打开图片编辑器]              │
├─ 高级 ▾ ─────────────────────┤  ← 默认折叠
│ 画布 240×280 · (120, 340)    │
└──────────────────────────────┘
```

### 5.1 共用组件（规划）

| 组件 | 职责 |
|------|------|
| `InspectorHeader` | 类型 badge、可编辑 title、折叠 id |
| `InspectorStatusChips` | 只读状态 chip 行 |
| `InspectorSummary` | ≤3 行摘要字段 |
| `InspectorConnections` | 入边 / 出边拓扑 |
| `InspectorHealth` | 警告计数 + 跳转 Drawer |
| `InspectorActions` | 主 CTA（打开编辑器 / 剪辑台） |
| `InspectorAdvanced` | L4 布局元数据，默认折叠 |

---

## 六、Generator Drawer 统一结构（模板）

```
┌─ 🖼️ 图片 · 图片 2          [生成 ▶] [✕] ─┐
├─ 预览 │ 参数（模型 / 风格 / 比例 / 参考）  │
├─ prompt 全宽编辑区                        │
└─ 能力警告（仅阻断级）                      ┘
```

- 顶栏 title 与 Inspector 的 title **同源**（`node.data.title`）
- Drawer 顶栏 title **只读展示**；改名在 Inspector（或画布节点双击）
- `GeneratorContent` 按 `nodeType` 路由到各 `*EditorPanel`

---

## 七、分节点类型内容矩阵

### 7.1 图片 `image`

| 区块 | Inspector | Drawer |
|------|-----------|--------|
| 身份 | 类型 badge、可编辑 title、id（折叠） | 顶栏只读 title |
| 状态 chip | `未生成` / `已生成` / `生成中` / `失败`；可选风格 chip | 预览区负责视觉 |
| 摘要 | 文件名；prompt 来源「来自 文本 2」（非全文） | — |
| 图上下文 | 入边 / 出边列表 | reference thumb + 源节点名 |
| 能力 | 「⚠ N 条连线问题」→ 打开 Drawer 并滚到警告 | 完整警告 + 阻断生成 |
| 快捷动作 | **打开图片编辑器** | 顶栏「生成」 |
| L3 编辑 | ❌ | model、style、ratio、prompt、batch |

### 7.2 视频 `video`

与图片同构。Inspector 额外状态 chip：`时长`、`首帧就绪` / `尾帧就绪`。Drawer 保留 `VideoGenerator` 全部表单。

### 7.3 音频 `audio`

| Inspector | Drawer |
|-----------|--------|
| 状态：未导入 / 已导入 / 分离中 | 文件选择、Demucs、分离 |
| 入边摘要 | 生成 / 导入控件 |
| **打开音频编辑器** | — |

### 7.4 文本 `text`（对齐 v6 方案 B）

| Inspector | Drawer |
|-----------|--------|
| `outputMode` **只读 badge** | `outputMode` **切换** |
| 草稿 / 输出 **字数**，不展示正文 | draft / output **双栏全文** |
| Vision 入边计数：「3 张参考图」 | Vision thumb 条 + 生成参数 |
| **打开文本编辑器** | LLM 模型、thinking、生成 |

### 7.5 脚本 `script`

| Inspector | Drawer |
|-----------|--------|
| 行数、已出图 / 已出视频计数 | `scriptRows` **表格编辑** |
| 批量任务状态：「出图中 3/12」 | 批量出图 / 出视频 |
| **打开脚本编辑器** | storyInput、AI 生脚本 |

> 「转为分镜组」保留在画布右键菜单，Inspector 不提供重复入口。

### 7.6 分镜组 `storyboard`

| Inspector | Drawer |
|-----------|--------|
| 帧数、已选 N 帧、当前 layout 名 | layout 切换、勾选、重生成 |
| 只读宫格概览（最多 3×3，不可操作） | 完整操作 + 导出 PNG / PDF / 4K |
| **打开分镜编辑器** | — |

### 7.7 合成 `compose`

**不使用 Generator Drawer**（走 Edit 模式 + `ComposeEditor`）。

| Inspector | Drawer |
|-----------|--------|
| 有效片段数、总时长、上次导出路径 | ❌ |
| **打开剪辑台**（主按钮） | EditMode 内编辑 |

### 7.8 连线 `edge`

**仅 Inspector**（无 Drawer）。

- 源 / 目标节点 + 端口
- 能力状态：实线 / 虚线 / 拒绝 + 原因
- 「断开连线」

### 7.9 未选中 / 多选

| 场景 | Inspector |
|------|-----------|
| 未选中 | 项目摘要、节点类型分布、快捷「+ 文本节点」 |
| 多选 | 选中 N 个、类型统计、**整组执行**、批量删除 |

---

## 八、重复项迁移对照表

| 字段 | 现 Inspector | 现 Drawer | 目标 |
|------|-------------|-----------|------|
| 缩略图 | 有（大图） | 有（大图） | **Drawer 大图**；Inspector 无或 48px 状态点 |
| model | 只读 | select | **仅 Drawer**；Inspector 可选只读 chip |
| style | 只读 | chips | **仅 Drawer**；Inspector 可选 1 词 chip |
| ratio | 只读 | select | **仅 Drawer** |
| prompt 全文 | 4 行 | 全文 | **仅 Drawer**；Inspector「来自 xxx / N 字」 |
| 能力徽章 | 完整 | 完整 | **Drawer 完整**；Inspector 计数 + 跳转 |
| 进度条 | 有 | 有 | **仅 Drawer**；Inspector「生成中」chip |
| 连线列表 | 有 | 部分 | **Inspector 完整**；Drawer 仅 reference |
| title | 可编辑 | 顶栏显示 | **Inspector 可编辑**；Drawer 顶栏只读 |
| 画布尺寸 | 有 | 无 | **仅 Inspector 高级** |

---

## 九、交互细则

### 9.1 Inspector → Drawer 跳转

| 触发 | 行为 |
|------|------|
| 「打开 xxx 编辑器」 | `setGeneratorDrawerOpen(true)` |
| 「查看 N 条警告」 | 打开 Drawer + scroll 到警告区 |
| 点击 model / style chip（若保留） | 打开 Drawer + focus 对应控件 |
| 快捷键 `G` | 同「打开编辑器」 |

### 9.2 Drawer 打开时 Inspector 行为

- 保持显示，不自动折叠（≥1280px）
- Inspector 实时反映 Drawer 内修改（同一 `node.data` 源）
- 生成中：Drawer 显示进度条；Inspector chip 变为「生成中」

### 9.3 Generate 模式

- 主工作区复用 Drawer 内容（`embedded`）
- Inspector 可自动折叠，避免三列抢宽

### 9.4 经典布局（Legacy）

- 居中 `GeneratorPanel` 仍遵循 L3 归属规则
- Legacy 无 Inspector 时，面板承担全部 L2+L3（与 v6 一致）

---

## 十、产品决策（待确认）

| # | 问题 | 推荐 | 备选 |
|---|------|------|------|
| 1 | Inspector 是否保留小缩略图？ | **48×48 状态点**（选中时不必盯画布） | 完全去掉 |
| 2 | Inspector 是否显示 model / style chip？ | **只读 chip**，点击打开 Drawer | 完全不显示 |
| 3 | compose 是否占用 Drawer？ | **否**，剪辑台独占 Edit 模式 | Drawer 内嵌简化时间轴 |
| 4 | title 编辑入口 | **Inspector + 画布双击**；Drawer 顶栏只读 | Drawer 也可编辑 |

---

## 十一、实施路线图

### Wave A — 定规范 + 图片 / 视频（2–3 天）

- [x] 本文档评审通过
- [x] 抽取 `InspectorHeader`、`InspectorStatusChips`、`InspectorConnections`、`InspectorActions`
- [x] 瘦身 `ImageInspectorDetails` / `VideoInspectorDetails`：移除 L3 字段
- [x] Inspector 警告摘要 + 跳转 Drawer

### Wave B — 文本 / 脚本 / 音频（2 天）

- [x] `TextInspectorDetails`：只留 mode badge + 字数 + Vision 计数
- [x] `ScriptInspectorDetails`：行数 + 关联资产计数
- [x] `AudioInspectorDetails`：对齐图片同构

### Wave C — 分镜 / 合成 / 边 / 多选（1–2 天）

- [x] `StoryboardInspectorDetails`、`ComposeInspectorDetails` 按模板统一
- [x] 多选 Inspector 摘要（`MultiSelectSummary`）
- [x] 更新 Coach Mark：「右边看状态，下面做编辑」
- [x] 同步 [02 编辑器壳层](./02_编辑器壳层与三模式布局.md) §六 Inspector 矩阵

### 技术约束

1. **单一数据源** — Inspector 与 Drawer 读同一 `node.data`，不各维护 state
2. **跳转而非复制** — Inspector 不提供 L3 只读副本的长文本
3. **组件分层** — `src/components/inspector/` 与 `src/components/panels/` 职责目录分离

### 规划文件结构

```
src/components/
  inspector/
    InspectorHeader.tsx
    InspectorStatusChips.tsx
    InspectorConnections.tsx
    InspectorHealth.tsx
    InspectorActions.tsx
    InspectorAdvanced.tsx
    details/
      ImageInspectorDetails.tsx   # 仅 L1/L2/L4 + 动作
      VideoInspectorDetails.tsx
      TextInspectorDetails.tsx
      ...
  shell/
    Inspector.tsx                 # 路由 + 布局壳
  panels/
    GeneratorContent.tsx          # 路由到各 EditorPanel
    ImageEditorPanel.tsx
    ...
```

---

## 十二、验收标准

| ID | 场景 | 通过标准 |
|----|------|----------|
| D1 | 选中图片节点，Drawer 关闭 | Inspector 无 textarea / select；5 秒内读懂状态 |
| D2 | 打开 Drawer | 所有 L3 字段仅出现在 Drawer |
| D3 | 在 Drawer 改 model | Inspector chip（若有）自动更新；Inspector 无 select |
| D4 | 生成中 | 进度条仅 Drawer；Inspector 显示「生成中」chip |
| D5 | 遍历全部节点类型 | 无 L3 字段以可编辑形态出现在 Inspector |
| D6 | 选中边 | 无 Drawer；Inspector 展示完整连线信息 |
| D7 | Legacy 布局 | 行为与 v6 一致，无 Inspector 回归 |

---

## 十三、与既有文档的关系

| 文档 | 关系 |
|------|------|
| [文本节点重设计](../../v6/design/LocalCanvas_文本节点重设计.md) | 文本节点 L2/L3 划分已对齐，Inspector 需瘦身以完全一致 |
| [图片节点与生成器重设计](./LocalCanvas_图片节点与生成器重设计.md) | Drawer 布局不变；Inspector 移除重复预览与参数字段 |
| [02 编辑器壳层](./02_编辑器壳层与三模式布局.md) | §六 Inspector 矩阵将在 Wave C 按本文更新 |
| [03 交互语法](./03_交互语法与微反馈.md) | `G` / Inspector CTA 统一为「打开 Drawer」 |

---

## 十四、结语

重复不是「信息不够」，而是**两层 UI 承担了同一层职责**。  
把 L3 编辑权完全收归 Drawer、把 Inspector 收成「身份证 + 导航」，用户会自然形成：**右看一眼，下面动手**——与 v6 文本节点、v8 图片节点的原始设计意图一致。

---

*实施前请确认 §十 产品决策；Wave A 可从图片节点 Inspector 瘦身开始，不必等待全节点设计评审完毕。*

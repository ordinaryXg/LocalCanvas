# LocalCanvas 图片节点与生成器重设计

> **目标**：让图片生成「看得见、改得动、生成快」——底部编辑器有清晰预览，风格模板可感知，去掉「生成器 / 图片生成器」双层冗余  
> **原则**：节点 = 状态卡片；面板 = 唯一深度编辑区；生成前可预期、生成后可对比  
> **日期**：2026-06-06  
> **状态**：✅ 已实施（Phase 0–2 基线）  
> **关联**：[v8 界面与体验重设计](../LocalCanvas_v8_界面与体验重设计.md)、[文本节点重设计](../../v6/design/LocalCanvas_文本节点重设计.md)

---

## 一、设计定位

### 1.1 我们是什么 / 不是什么

| 是 | 不是 |
|----|------|
| 画布上的**单帧图片资产节点** | 图库管理器、批量修图工具 |
| 接收 prompt（自填或上游文本）→ 调模型 → 出图挂到节点 | Photoshop 级编辑 |
| 可选参考图（img2img / 风格参考） | 多版本资产管理中心（那是 History Tab 的补充） |

### 1.2 核心用户路径（80% 场景）

```
文本节点 ──prompt──► 图片节点 → 打开底部面板 → 确认预览与参数 → 生成
                                              → 结果出现在面板 + 节点缩略图 → 连线到视频/合成
```

### 1.3 设计原则

1. **预览优先** — 面板第一眼是「当前图」，不是表单
2. **一层标题** — 壳层说「是什么节点」，不再重复「生成器」
3. **风格可感知** — 选风格 = 看见 prompt 如何变，不是神秘下拉框
4. **节点与面板分工** — 与文本节点、合成台同一语法：画布看状态，面板做操作
5. **少滚动** — 1920×1080 下，主路径不滚即可生成

---

## 二、现状问题

### 2.1 底部编辑器无生成图预览

| 位置 | 现状 | 问题 |
|------|------|------|
| **画布 `ImageNode`** | 140px 缩略图 +「预览图片」全屏 | 节点上有图，但用户习惯在底部面板操作 |
| **`ImageGenerator` 面板** | 仅 prompt 表单 + 参数列 | **无**当前 `imageSrc` / 生成结果预览 |
| **`GenerateMode`（v8）** | 左侧有大图预览 | 仅 generate 模式有；**canvas + Drawer 路径没有** |

用户反馈本质：**编辑器和结果分离**——在下面改 prompt、点生成，眼睛却要回到画布小图才能确认。

**相关代码**

| 模块 | 路径 |
|------|------|
| 节点缩略图 | `src/components/nodes/ImageNode.tsx` |
| 底部编辑器（新） | `src/components/panels/ImageEditorPanel.tsx` |
| 预览组件 | `src/components/panels/CurrentImagePreview.tsx` |
| 可拉伸预览 | `src/components/panels/ResizablePreviewPane.tsx` |
| 风格 chips | `src/components/panels/StylePresetChips.tsx` |
| 旧入口（薄包装） | `src/components/panels/ImageGenerator.tsx` → 转发 `ImageEditorPanel` |
| Drawer 壳层 | `src/components/shell/GeneratorDrawer.tsx` |
| 顶栏生成桥接 | `src/stores/generatorHeaderStore.ts` |
| 内容路由 | `src/components/panels/GeneratorContent.tsx` |
| 预览尺寸常量 | `src/utils/imageEditorLayout.ts` |

### 2.2 标题冗余

当前嵌套结构：

```
GeneratorDrawer 顶栏     →  「生成器」
GeneratorContent 内标题   →  「🖼️ 图像生成器」
```

两层都在说「这是生成类 UI」，第二层没有新增信息。对比文本节点：`TextEditorPanel` 不再重复「文本生成器」类标题，由壳层统一。

### 2.3 风格模板：功能梳理

**数据定义**（`src/constants/stylePresets.ts`）：

| 字段 | 用途 | 是否对用户可见 |
|------|------|----------------|
| `id` / `name` | 下拉选项 | ✅ |
| `promptPrefix` | 生成时前缀拼到 prompt | ❌ 不可见 |
| `negativePrompt` | 生成时追加到负向 prompt | ❌ 不可见 |
| `recommendedImageModel` | 设计预留 | ❌ **未接入** ImageGenerator |
| `recommendedVideoModel` | 视频用 | — |

**运行时行为**（`ImageGenerator.handleGenerate`）：

1. 用户选 `styleId`（或「无」）
2. 点击生成时调用 `applyStyleToPrompt(prompt, preset)` → `prefix + prompt`
3. 负向词合并：`[negativePrompt, preset.negativePrompt].join(', ')`
4. 成功后把 `styleId` 写入 `node.data`，**画布节点不展示当前风格**

**其他入口**：

| 入口 | 行为 |
|------|------|
| Slash `/style` | Toast：「请在生成器面板选择风格模板」— **无实际跳转** |
| History | 存生成记录，可复用到新节点，**不恢复 styleId** |
| dataFlow | 文本 → `prompt` 口同步文案，**与 style 无关** |

**结论**：风格模板本质是 **「生成时 prompt 后缀/前缀 + 负向词包」**，UI 却只提供一个 select，用户无法理解、无法预览、无法感知是否生效。`recommendedImageModel` 完全未用。

### 2.4 布局与效率

| 问题 | 表现 |
|------|------|
| 双栏表单优先 | 左 prompt、右参数；**无结果区** |
| 参考图仅小 thumb | 有连线时 64px，无连线时不展示「可连参考图」提示 |
| 能力徽章缩在模型下 | 非法连线原因需去 Inspector 看 |
| batch 1/2/4 | 多图时仅返回一张路径写入节点（batch>1 行为需文档化） |

---

## 三、方案总览：ImageEditorPanel

> 命名对齐 `TextEditorPanel` / `ComposeEditor`：**Panel = 选中节点后的唯一编辑区**。

### 3.1 架构关系

```
┌─────────────────────────────────────────────────────────────┐
│ GeneratorDrawer 顶栏：🖼️ 图片 · {节点名/文件名}    [生成 ▶] [✕] │
├──────────────────────────┬──────────────────────────────────┤
│  PreviewColumn (flex-1)  │  ParamsColumn (280px)            │
│  · 当前图大图             │  · 模型 + 比例 + 数量             │
│  · 空状态占位             │  · 风格 chips                    │
│  · 生成中 skeleton        │  · 参考图条                      │
│  · 最近 3 次缩略条（可选） │  · 能力警告                      │
├──────────────────────────┴──────────────────────────────────┤
│ PromptRow：正向（可折叠负向）                                  │
└─────────────────────────────────────────────────────────────┘
```

**取消** `GeneratorContent` 内第二层「图像生成器」标题；Drawer 顶栏即唯一标题。

### 3.2 与画布节点分工

| 画布 `ImageNode`（状态卡片） | 底部 `ImageEditorPanel` |
|------------------------------|-------------------------|
| 缩略图（保持） | **大图预览**（同源 `imageSrc` / asset） |
| prompt 摘要 2 行 | 完整可编辑 prompt |
| 参考图 小角 | 参考图条 + 断开/更换 |
| 生成进度条 | 进度 + 取消 |
| 不展示 style | 风格 chip + 「生效 prompt」摘要 |

---

## 四、预览区设计

### 4.1 状态

| 状态 | UI |
|------|-----|
| **空** | 虚线框 +「尚未生成 · 填写 prompt 后点生成」+ 可选拖入上传 |
| **有图** | `object-contain` 最大高度占 PreviewColumn 70%；点击全屏 `ImagePreview` |
| **生成中** | 同区域 pulse + 进度 %；保留上一张图 ghost（可选） |
| **失败** | 红字 error +「重试」 |

### 4.2 数据来源

- 与节点共用：`imageSrc` / `imageAssetPath` / `fileName`
- 使用现有 `useLazyAssetBlob` / `NodeImageThumb` 逻辑，**不新增字段**
- 生成成功仍 `updateNodeData` 写回节点——**节点与面板自动同步**

### 4.3 最近版本条（P1，可选）

- 从 `window.api.history.query({ nodeId })` 或节点 local `data.recentOutputs[]` 读最近 3 张
- 点击切换「当前预览」并 `updateNodeData` 设为 active（不强制 P0）

---

## 五、风格模板重设计

### 5.1 概念 rename（对用户）

UI 文案：**风格** 或 **Look**（不用「模板」二字，减少与「工作流模板」混淆）

### 5.2 交互：Chip + 生效预览

```
风格  [无] [电影感] [动漫] [产品] [纪录片] [赛博] 

生效 prompt（只读，小字）：
  cinematic film still, dramatic lighting… + 你的描述
负向：cartoon, anime, low quality… + 你的负向
```

| 交互 | 行为 |
|------|------|
| 点击 chip | 切换 `styleId`；**即时**更新生效 prompt 预览（不必点生成） |
| hover chip | tooltip 展示 prefix 首句 |
| 选「无」 | 预览 = 原始 prompt |

### 5.3 生成时行为（保持兼容）

- 仍调用 `applyStyleToPrompt` / 负向合并——**API 层不变**
- `styleId` 持久化到 `node.data`
- 画布节点可选：角标 `🎨电影`（P2）

### 5.4 补全预留能力（P2）

| 字段 | 建议行为 |
|------|----------|
| `recommendedImageModel` | 选风格后顶栏轻提示「推荐 Seedream · 应用」一键切换 |
| Slash `/style` | 打开 Drawer 并 focus 风格 chip 行，而非 Toast |

### 5.5 与视频共用

`STYLE_PRESETS` 仍共用；`VideoGenerator` 同步 chip UI（实施时可抽 `StylePresetChips.tsx`）

---

## 六、标题与壳层合并

### 6.1 GeneratorDrawer 顶栏（按节点类型动态）

| 节点类型 | 顶栏标题 | 右侧主按钮 |
|----------|----------|------------|
| image | `🖼️ 图片 · {fileName\|图片}` | `生成` |
| video | `🎥 视频 · …` | `生成` |
| text | `📝 文本 · …` | — |

**删除** 通用「生成器」三字；**删除** `GeneratorContent` 内 `LABELS` 行。

### 6.2 GeneratorContent 职责

仅路由到各 `*EditorPanel`，**不再渲染类型标题**。

```tsx
// 目标形态
export function GeneratorContent({ nodeId, nodeType }: Props) {
  if (nodeType === 'image') return <ImageEditorPanel nodeId={nodeId} />
  // ...
}
```

`ImageGenerator.tsx` 重命名或内联为 `ImageEditorPanel.tsx`（实施时二选一）。

---

## 七、参数区布局（高效默认值）

### 7.1 单列 280px（右栏）

| 顺序 | 控件 | 说明 |
|------|------|------|
| 1 | 模型 select + `ModelCapabilityBadges` | 不变 |
| 2 | 比例 + 数量 | 同一行 |
| 3 | 风格 chips | §五 |
| 4 | 参考图 | 有连线：thumb + 源节点名；无：灰色「连接图片节点到 reference 口」 |
| 5 | 能力警告 | 来自 `collectInboundEdgeWarnings`，阻断时禁用生成 |

### 7.2 Prompt 区（底栏全宽）

- **正向** `ResizableTextarea` minHeight 80
- **负向** 默认折叠「高级 ▾」，展开后 input
- 若 `prompt` 由上游文本同步（dataFlow），显示 🔗 标记 +「来自 xxx 节点」只读提示，可「解链编辑」

### 7.3 主按钮位置

- **顶栏右侧「生成」**：拇指热区，Drawer 任意滚动位置可点
- 右栏底部保留次要「生成」或移除重复（只留顶栏一处）

---

## 八、数据模型（增量）

```typescript
interface ImageNodeData {
  // 现有
  title?: string                    // 可编辑节点名，默认「图片 N」
  imageSrc?: string
  imageAssetPath?: string
  prompt?: string
  negativePrompt?: string
  modelId?: string
  ratio?: string
  styleId?: string
  fileName?: string
  isGenerating?: boolean
  progress?: number
  error?: string

  /** 面板 UI（与画布节点尺寸解耦，仅存 editorUi） */
  editorUi?: {
    negativeOpen?: boolean
    previewHeight?: number   // 默认 260，范围 120–720
    previewWidth?: number    // 默认 480，范围 200–1400（受 Drawer 宽度裁剪）
  }
  /** 最近输出 asset 路径，最多 3 条 */
  recentOutputs?: string[]
}
```

**不新增** `draft`/`output` 分裂——图片节点下游读 `image` 口二进制，prompt 仅生成参数，与文本节点语义不同。

---

## 九、实施路线图

### Phase 0 — 快修（1–2 天）

- [x] `ImageEditorPanel` + **CurrentImagePreview**（读 node data）
- [x] 合并标题：Drawer 动态标题 + 去掉 `GeneratorContent` 重复行
- [x] 风格：select 改 **StylePresetChips** + 生效 prompt / 负向只读预览

### Phase 1 — ImageEditorPanel 布局（2–3 天）

- [x] 左预览 / 右参数 / 底 prompt 三区（始终左右分栏 + 竖向分隔条可调预览宽度）
- [x] 顶栏「生成」经 `generatorHeaderStore` 绑定 `handleGenerate`
- [x] 非法连线警告移入面板
- [x] `GenerateMode` 复用 `ImageEditorPanel`（`embedded` 模式自渲染顶栏）

### Phase 2 — 体验补全（1–2 天）

- [x] Slash `/style` → 打开 Drawer 并 focus 风格 chip 行（`editorShellStore.requestFocusStyleChips`）
- [x] `recommendedImageModel` 轻提示 + 一键应用
- [x] 画布节点 **badge** 显示当前风格名
- [x] 最近 3 张历史条（`recentOutputs` + `CurrentImagePreview` 缩略切换）
- [ ] `VideoGenerator` 同步 chip UI（仍为 select，见 §5.5）

---

## 十、验收标准

| ID | 场景 | 通过标准 |
|----|------|----------|
| I1 | 已有图的节点打开 Drawer | 首屏可见 ≥240px 高预览，无需看画布 |
| I2 | 生成完成 | 预览与节点缩略图 **1s 内**同步更新 |
| I3 | 选「电影感」风格 | 生效 prompt 预览出现 prefix，无需生成 |
| I4 | 标题 | Drawer 内 **0 处**「生成器」+「图片生成器」叠字 |
| I5 | 主路径 | 打开 → 改 prompt → 生成，**0 次**滚动（1080p） |
| I6 | 文本→图片连线 | prompt 区显示来源提示；生成使用同步后的文案 |

---

## 十一、附录：风格模板一览（现行）

| id | 名称 | prefix 摘要 | 负向摘要 |
|----|------|-------------|----------|
| cinematic | 电影感 | cinematic film still, dramatic lighting… | cartoon, anime, low quality… |
| anime | 动漫 | anime style, vibrant colors… | photorealistic, blurry… |
| product-ad | 产品广告 | commercial product photography… | cluttered, dark… |
| documentary | 纪录片 | documentary footage, natural lighting… | fantasy, cartoon… |
| cyberpunk | 赛博朋克 | cyberpunk neon city, rain… | daylight pastoral… |

**代码入口**：`applyStyleToPrompt()` — 仅在 `handleGenerate` 内调用，**不**写回 `node.data.prompt`，故画布节点 prompt 摘要始终为用户原文，与风格无关（设计上一致，但需在面板「生效预览」中补足感知）。

---

## 十二、结语

图片节点的核心矛盾不是「少一个模型参数」，而是 **结果不在操作发生的地方显示**。  
把预览抬进面板、把风格从隐藏前缀变成可见 chips、把双层「生成器」收成一行标题——三处改完，图片生成会从「表单提交」变成「看得见的工作台」。

---

## 十三、实施记录（2026-06-06）

### 13.1 新增 / 重构文件

| 文件 | 职责 |
|------|------|
| `ImageEditorPanel.tsx` | 图片节点唯一深度编辑区：预览 + 参数 + prompt |
| `CurrentImagePreview.tsx` | 空态 / 有图 / 生成中 / 最近 3 张切换 |
| `ResizablePreviewPane.tsx` | 预览区高度（横条）+ `PreviewWidthSplitter` 宽度（竖条） |
| `StylePresetChips.tsx` | 风格 chip、生效 prompt 预览、推荐模型提示 |
| `generatorHeaderStore.ts` | Drawer 顶栏「生成 / 取消」与面板逻辑解耦 |
| `nodeNaming.ts` | 递增默认标题「图片 1」「图片 2」… |
| `imageEditorLayout.ts` | 编辑器预览默认/边界常量（与画布节点尺寸无关） |

### 13.2 与草案的差异

| 项 | 草案 | 实际 |
|----|------|------|
| 预览与画布联动 | 节点拉伸可影响编辑器布局 | **已解耦**：预览尺寸仅存 `node.data.editorUi`，不再 `updateNodeSize` |
| 布局方向 | 窄节点时可能 stack 垂直 | **始终左右分栏**，竖向分隔条调预览宽度 |
| 输出端口 icon | 输入/输出均显示 | **仅输入口**显示 port icon（`PortHandle.tsx`） |
| 节点标题 | 固定类型名 | **双击可编辑**；`addNode` / `duplicateNode` 自动赋递增默认名 |
| 上游断开 | prompt 可能残留 | **dataFlow**：无 `prompt` 入边时 `mergePatch({ prompt: undefined })` |
| 无限更新循环 | — | 修复：`useModelGeneration` 的 `onProgress` 用 ref；`generatorHeaderStore` 值未变时跳过更新 |

### 13.3 Inspector 增强

选中图片节点时，右侧 Inspector 展示：模型名、比例、风格、prompt 摘要、参考图 thumb、入边能力警告等（`Inspector.tsx`）。

### 13.4 验收对照

| ID | 状态 | 备注 |
|----|------|------|
| I1 | ✅ | 预览默认 260px 高，可拖至 720px |
| I2 | ✅ | 生成写回 `updateNodeData`，节点缩略图同步 |
| I3 | ✅ | StylePresetChips 即时预览 prefix |
| I4 | ✅ | Drawer 顶栏「🖼️ 图片 · {名}」，无双层「生成器」 |
| I5 | 🔶 | 1080p 下多数场景 0 滚动；极窄 Drawer 可能需滚参数列 |
| I6 | ✅ | prompt 来源提示 + 断开上游清除 prompt |

### 13.5 待办

- [ ] `VideoGenerator` 风格 UI 与图片对齐（§5.5）
- [ ] batch>1 时多图行为文档化与 UI 反馈

---

*Phase 0–2 已与 v8 `GeneratorDrawer` 壳层一并交付；Video chip 同步可独立跟进。*

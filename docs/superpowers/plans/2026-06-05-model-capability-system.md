# 模型能力系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan step-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 `ModelCapabilityProfile` + `ReasoningProfile` 驱动画布连线（实线/虚线）、生成前校验与 LLM 思考档位，覆盖 P0 主流模型。

**Architecture:** L1 内置 `src/capabilities/builtin/profiles.ts` + `CapabilityRegistry` 解析；`edge-compat.ts` 在连线时评估槽位；`reasoning-params.ts` 将统一三档映射到厂商 API；设置页重设计留 Phase 2。

**Tech Stack:** TypeScript, Vitest, Zustand, React Flow, Electron utility adapter

**Spec:** `docs/v6/design/LocalCanvas_模型能力系统重设计.md` v0.3

---

## File Map

| 文件 | 职责 |
|------|------|
| `src/types/capability.ts` | Profile / Reasoning / EdgeCompat 类型 |
| `src/capabilities/builtin/profiles.ts` | P0 内置能力目录 |
| `src/capabilities/registry.ts` | resolve(profile_key / model / configId) |
| `src/capabilities/reasoning-params.ts` | buildReasoningParams |
| `src/capabilities/edge-compat.ts` | evaluateEdgeCompat + 生成前聚合校验 |
| `src/capabilities/handle-slots.ts` | handle → modality/slot |
| `src/utils/canvasEdge.ts` | 实线/虚线样式 |
| `src/stores/canvasStore.ts` | onConnect 写入 compatStatus |
| `src/components/canvas/Canvas.tsx` | isValidConnection 允许虚线场景 |

---

## Phase 0: 能力内核

### Task 1: 类型定义

**Files:** Create `src/types/capability.ts`

- [ ] 定义 `ModelCapabilityProfile`, `ReasoningProfile`, `InputSlotSpec`, `EdgeCompatStatus`, `ThinkingPreset`

### Task 2: P0 内置目录

**Files:** Create `src/capabilities/builtin/profiles.ts`

- [ ] DeepSeek V4 Pro/Flash + aliases
- [ ] GPT-4o, o3-mini, Claude Sonnet, Gemini 2.5 Flash/Pro
- [ ] Qwen, GLM, Kimi k2 instruct/thinking
- [ ] Seedream 4.5, Seedance 1.0/2.0, DALL-E 3, Flux

### Task 3: Registry

**Files:** Create `src/capabilities/registry.ts`, `src/capabilities/registry.test.ts`

- [ ] `resolveProfile({ model, configId, kind })`
- [ ] alias 迁移 `resolveModelIdWithAlias`
- [ ] provider 降级模板

### Task 4: Reasoning 参数构建

**Files:** Create `src/capabilities/reasoning-params.ts`, `src/capabilities/reasoning-params.test.ts`

- [ ] `buildReasoningParams(profile, preset)` 返回请求体片段
- [ ] DeepSeek / Qwen / GLM 映射测试

---

## Phase 1: 画布连线 + 生成校验

### Task 5: Handle → Slot 映射

**Files:** Create `src/capabilities/handle-slots.ts`

- [ ] `sourceHandleToModality`, `targetHandleToSlotId`

### Task 6: Edge 兼容评估

**Files:** Create `src/capabilities/edge-compat.ts`, `src/capabilities/edge-compat.test.ts`

- [ ] `evaluateEdgeCompat({ sourceType, sourceHandle, targetType, targetHandle, targetModelId, edges })`
- [ ] 返回 `solid | dashed_warn | reject` + reason
- [ ] `collectInboundEdgeWarnings(nodeId, nodes, edges)` 生成前用

### Task 7: 虚线边样式

**Files:** Modify `src/utils/canvasEdge.ts`, `src/utils/canvasEdge.test.ts`

- [ ] `CANVAS_EDGE_STYLE_WARN`, `edgeStyleForCompat(status)`
- [ ] `connectionToEdgeParams` 接受 `compatStatus`

### Task 8: Store + Canvas

**Files:** Modify `src/stores/canvasStore.ts`, `src/components/canvas/Canvas.tsx`

- [ ] onConnect 评估 compat 写入 edge.data
- [ ] isValidConnection: 类型层兼容 OR model 层 dashed（非 reject）

### Task 9: 生成前阻断

**Files:** Create `src/capabilities/generation-guard.ts`

- [ ] `assertNoWarnEdgesForNode(nodeId, nodes, edges)` 抛用户可读错误
- [ ] 接入 `TextEditorPanel` generate 流程

---

## Phase 1b: LLM 思考档位

### Task 10: Presets 更新

**Files:** Modify `src/constants/modelPresets.ts`

- [ ] 增加 `profile_key`；DeepSeek V4；GPT-4o；o3-mini 等 P0 预设

### Task 11: 节点 runtime_prefs

**Files:** Modify `src/types/node.ts`, `src/components/text/TextEditorPanel.tsx`

- [ ] `thinkingPreset?: ThinkingPreset` 持久化到节点 data
- [ ] UI 下拉：快速 / 标准 / 深度（profile 支持时显示）

### Task 12: Adapter

**Files:** Modify `electron/utility/services/model-adapter/base.ts`, `remote-api.ts`

- [ ] `GenerateTextParams.thinkingPreset`
- [ ] generateText 合并 `buildReasoningParams`

---

## Phase 2: 设置页 + GeneratorPanel 动态参数

### Task 13: 设置页重设计 — ✅ 已完成

**Files:**
- `src/capabilities/profile-display.ts`
- `src/components/panels/ModelCapabilityBadges.tsx`
- `src/components/panels/ModelSettingsSection.tsx`
- `src/components/panels/SettingsPanel.tsx`

- [x] 统一「已接入模型」Tab + 左侧 kind 筛选
- [x] 能力徽章（入/出/思考/目录来源）
- [x] 详情抽屉：endpoint、model id、API Key
- [x] 从目录添加 + 预设能力预览
- [x] 刷新内置目录（v1 本地，无 L4）

### Task 14: GeneratorPanel 动态参数 — 已完成

- [x] `generator-ui.ts`：profile → 首帧/尾帧/参考图/同步音频等 UI 标志
- [x] `VideoGenerator`：能力徽章、不兼容入边提示、生成前 `video` guard、切换模型刷新边
- [x] `ImageGenerator`：参考图预览与能力提示、生成前 `image` guard、能力徽章
- [x] L2 厂商 models 列表同步缓存（SQLite + IPC + 设置页「同步厂商列表」）

### Task 15: 参考媒体接入生成 API — 已完成

- [x] `resolveMediaRefForApi`：图/视频/音频统一解析
- [x] Seedream：`image` 参考图数组传入 `/images/generations`
- [x] Seedance 2.0：`role` 标注 first/last/reference + video_url/audio_url
- [x] `ImageGenerator` / `VideoGenerator` 收集入边并传入 IPC

### Task 16: 节点 handle 按 profile 灰显 — 已完成

- [x] `node-port-ui.ts`：按 profile 决定可见入边端口
- [x] `VideoNode` / `ImageNode` 动态 ports；已占用单槽位灰显

### Task 17: L3 Probe — 已完成

- [x] `custom-infer.ts`：从 `request_template` 静态推断能力
- [x] `capability_probe_cache` SQLite + IPC `capability:probe`
- [x] `probed-profile-cache` 渲染进程缓存 + Registry 合并
- [x] 设置页「验证能力」+ 生成失败探测提示

### Task 18: Agent Registry 选模 — 已完成

- [x] `agent-model-select.ts`：按能力需求筛选已接入模型
- [x] `agent-plan-enrich.ts`：根据计划连线推断需求并写入 modelId
- [x] `agent-catalog.ts`：LLM 规划 prompt 注入模型能力目录
- [x] `agent-service`：技能模板与 LLM 规划均经 Registry 选模

### Task 20: LLM Vision 多图进 generateText — 已完成

- [x] `llmVisionSlots.ts` + `llm-vision-content.ts`：image1…imageN 端口与 OpenAI 多模态消息
- [x] `TextNode` 按 profile 动态 Vision 端口；`TextEditorPanel` / DAG 收集图片传入 IPC
- [x] `remote-api.generateText` 合并 `image_url` content parts
- [x] generation-guard 消费 Vision 入边；edge-compat 全槽位计数

### Task 19: Seedance 2.0 多参考图视频端口 — 已完成

- [x] `videoReferenceSlots.ts`：`reference1`…`reference9` handle 工具
- [x] `node-port-ui`：Seedance 2.0 按 `maxReferenceImages` 动态展示参考图端口
- [x] 连线兼容 / 槽位计数 / 生成 guard / Agent 选模推断
- [x] `VideoGenerator`：收集多路参考图并传入 `referenceImages`，面板显示 `n/9` 计数

---

## Verification

```bash
npm test
npm run build
```

Expected: 全部 Vitest 通过；build 无 TS 错误。

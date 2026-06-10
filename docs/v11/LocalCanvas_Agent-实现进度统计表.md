# LocalCanvas Agent — 实现功能统计表

> **用途**：按条目跟踪 v11 / v12 Agent 实现进度；你更新本表即可，设计规格仍以 [演进对照](./LocalCanvas_Agent-演进对照.md) 为准。  
> **最后更新**：2026-06-10（v11.1 Slice B 代码落地）  
> **关联**：[v11 规划](./LocalCanvas_v11_Agent与设置增强.md) · [v12 规划](../v12/LocalCanvas_v12_Studio复杂片与Agent深化.md) · [演进对照](./LocalCanvas_Agent-演进对照.md)

---

## 使用说明

### 状态图例


| 符号  | 含义               |
| --- | ---------------- |
| ⬜   | 未开始              |
| 🔶  | 进行中              |
| ✅   | 已完成              |
| ⏸   | 暂缓 / 阻塞          |
| —   | 保持现状（基线已有，本切片不改） |


### 更新方式

1. 找到对应 **序号 `IMP-*`** 或 **能力 `A**`** 行，改 **状态** 列。
2. 完成时填写 **完成日期**（`YYYY-MM-DD`），**备注** 可写 PR、commit、阻塞原因。
3. 改完顶部 **进度总览** 各切片计数（手算即可，不必自动化）。
4. 改文首 **最后更新** 日期。

### 建议实施顺序

```
v11.0 → v11.1 → v11.2 → v12.0 → v12.1 → v12.2
```

与 [演进对照 §九](./LocalCanvas_Agent-演进对照.md#九文档与实现顺序建议) 一致。

---

## 进度总览


| 切片            | 条目数    | ✅      | 🔶    | ⬜      | ⏸     |
| ------------- | ------ | ------ | ----- | ------ | ----- |
| 基线回归 A01–A07  | 7      | 7      | 0     | 0      | 0     |
| v11.0 Slice A | 12     | 11     | 0     | 1      | 0     |
| v11.1 Slice B | 8      | 0      | 0     | 8      | 0     |
| v11.2 Slice C | 6      | 0      | 0     | 6      | 0     |
| v12.0 Wave 1  | 14     | 0      | 0     | 14     | 0     |
| v12.1 Wave 2  | 5      | 0      | 0     | 5      | 0     |
| v12.2 Wave 3  | 4      | 0      | 0     | 4      | 0     |
| 验收 / QA       | 9      | 1      | 0     | 8      | 0     |
| **合计**        | **65** | **18** | **0** | **47** | **0** |


> 基线 A01–A07 在 [演进对照 §一](./LocalCanvas_Agent-演进对照.md#一能力--版本--代码对照表) 已标 ✅；若回归失败请改回 ⬜ 并记入备注。

---

## 一、基线回归（保持 / 轻改）


| 序号      | 能力  | 功能项                 | 主要代码路径                                         | 状态  | 完成日期 | 备注                                |
| ------- | --- | ------------------- | ---------------------------------------------- | --- | ---- | --------------------------------- |
| IMP-B01 | A01 | Agent 对话 + 会话持久化    | `AgentPanel` · `agent-session-repository`      | —   |      | v12 扩展 `productionPlan` 见 IMP-120 |
| IMP-B02 | A02 | Skill 静默命中（v11.0 前） | `agent-service.ts` · `skills/`*                | —   |      | v11.0 由 IMP-007 替代行为              |
| IMP-B03 | A03 | LLM 工作流规划（Lite）     | `workflow-planner.ts` · `parseWorkflowPlan.ts` | —   |      | ShotSpec 见 IMP-114                |
| IMP-B04 | A04 | 能力选模 enrich         | `agent-plan-enrich.ts`                         | —   |      | blocking UI 见 IMP-006             |
| IMP-B05 | A05 | WorkflowPlan 落画布    | `applyWorkflowPlan.ts`                         | —   |      | ProductionPlan 见 IMP-111          |
| IMP-B06 | A06 | auto DAG 执行         | `useDagRun.ts`                                 | —   |      | Studio 禁全片 auto 见 IMP-113         |
| IMP-B07 | A07 | manual 计划           | `parseWorkflowPlan` · DAG                      | —   |      |                                   |


---

## 二、v11.0 — Slice A（P0，可发布）


| 序号      | 能力  | 功能项                                              | 主要代码路径                                       | 状态  | 完成日期       | 备注                                                               |
| ------- | --- | ------------------------------------------------ | -------------------------------------------- | --- | ---------- | ---------------------------------------------------------------- |
| IMP-001 | A09 | Settings **Agent Tab** 骨架                        | `SettingsPanel.tsx` · `SettingsAgentTab.tsx` | ✅   | 2026-06-10 |                                                                  |
| IMP-002 | A09 | Agent **就绪卡**（LLM/模型缺失提示）                        | `SettingsAgentTab.tsx`                       | ✅   | 2026-06-10 |                                                                  |
| IMP-003 | A26 | **AgentPreferences** 类型 + `lc-agent-preferences` | `src/utils/agentPreferences.ts`              | ✅   | 2026-06-10 | 规格 [演进对照 §六](./LocalCanvas_Agent-演进对照.md#六agentpreferences-统一配置) |
| IMP-004 | A26 | 旧 key 迁移（`disabled-skills` 等）                    | `loadAgentPreferences`                       | ✅   | 2026-06-10 | 单测 `agentPreferences.test.ts`                                    |
| IMP-005 | A10 | **模板召回卡片** `AgentTemplateCards`                  | `AgentPanel`                                 | ✅   | 2026-06-10 | 替代静默 Skill                                                       |
| IMP-006 | A04 | blocking 警告 → **去配置** 深链接                        | `WorkflowPlanPreview` · `openSettings`       | ✅   | 2026-06-10 |                                                                  |
| IMP-007 | A02 | 模板召回 `rankSkillsForIntent` + 采纳 IPC              | `skills/index.ts` · `agent-service.ts`       | ✅   | 2026-06-10 | 不再静默 matchSkill                                                  |
| IMP-008 | A14 | `openSettings({ tab, focus })`                   | `editorShellStore.ts`                        | ✅   | 2026-06-10 |                                                                  |
| IMP-009 | A14 | AgentPanel 跳转 Settings Agent Tab                 | `AgentPanel.tsx`                             | ✅   | 2026-06-10 |                                                                  |
| IMP-010 | —   | Settings Agent Tab **i18n** zh/en                | `src/i18n/*.json`                            | ✅   | 2026-06-10 |                                                                  |
| IMP-011 | —   | **agent-guide** 与设置页联调文案                         | `docs/v5/agent-guide.md`                     | ✅   | 2026-06-10 |                                                                  |
| IMP-012 | —   | **v5 P1 Agent 跑表** ≥80%                          | `docs/v5/…` 附录 A                             | ✅   |            | 需手工跑表                                                            |


**v11.0 可选（P1，不挡发布）**


| 序号      | 能力  | 功能项                               | 主要代码路径       | 状态  | 完成日期 | 备注                |
| ------- | --- | --------------------------------- | ------------ | --- | ---- | ----------------- |
| IMP-013 | A11 | Plan/Build **模式切换 UI**（仅 UI，路由未开） | `AgentPanel` | ⬜   |      |                   |
| IMP-014 | A16 | 片型 **标签只读** 展示（规则预判）              | `AgentPanel` | ⬜   |      | 完整分类见 v12 IMP-101 |


---

## 三、v11.1 — Slice B（P1）


| 序号      | 能力  | 功能项                           | 主要代码路径                      | 状态  | 完成日期 | 备注                                                                    |
| ------- | --- | ----------------------------- | --------------------------- | --- | ---- | --------------------------------------------------------------------- |
| IMP-021 | A12 | `GraphPatch` 类型定义             | `src/types/agent.ts`        | ⬜   |      |                                                                       |
| IMP-022 | A12 | GraphPatch **应用器** + 预览       | `applyGraphPatch.ts`（新建）    | ⬜   |      |                                                                       |
| IMP-023 | A12 | Build 模式路由到 GraphPatch        | `agent-service.ts` · IPC    | ⬜   |      |                                                                       |
| IMP-024 | A13 | **Focused Nodes** 芯片（画布选中同步）  | `AgentPanel`                | ⬜   |      |                                                                       |
| IMP-025 | A08 | Studio 确认后 **不自动** `startRun` | `AgentPanel` · `useDagRun`  | ⬜   |      | checkpoint 最小版                                                        |
| IMP-026 | A22 | **Handoff 导航条** UI + 动作       | `AgentHandoffBar.tsx`（新建）   | ⬜   |      | 规格 [演进对照 §五](./LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航) |
| IMP-027 | A22 | Handoff → 选中节点 + Dock 展开      | `editorShellStore` · `Dock` | ⬜   |      | 验收 ST-05                                                              |
| IMP-028 | A11 | Plan / Build **路由生效**         | `agent-service.ts`          | ⬜   |      | 依赖 IMP-021–023                                                        |


---

## 四、v11.2 — Slice C（P2）


| 序号      | 能力  | 功能项                             | 主要代码路径                           | 状态  | 完成日期 | 备注                  |
| ------- | --- | ------------------------------- | -------------------------------- | --- | ---- | ------------------- |
| IMP-031 | —   | **Phase Rail**（简报·镜头表·脚本·分镜·合成） | `AgentPhaseRail.tsx`             | ⬜   |      | CP0/CP1/CP2/CP3/CP5 |
| IMP-032 | A17 | Brief 卡 **只读 + 可编辑字段**（非 HITL）  | `AgentBriefCard.tsx`             | ⬜   |      | 完整 HITL 见 IMP-103   |
| IMP-033 | A18 | Shot List **折叠预览表**             | `AgentShotList.tsx`              | ⬜   |      | 完整校验见 IMP-104       |
| IMP-034 | A15 | AgentCompanion **Drawer 自动收起**  | `AgentCompanion` · `EditorShell` | ⬜   |      |                     |
| IMP-035 | A15 | Agent 操作 **Toast 审计**           | `AgentPanel`                     | ⬜   |      |                     |
| IMP-036 | —   | DAG 面板「**继续**」paused run（可选）    | `useDagRun` · DAG UI             | ⬜   |      | 可标 ⏸ 延后             |


---

## 五、v12.0 — Wave 1（ProductionPlan 核心）


| 序号      | 能力  | 功能项                                         | 主要代码路径                                          | 状态  | 完成日期 | 备注                                                            |
| ------- | --- | ------------------------------------------- | ----------------------------------------------- | --- | ---- | ------------------------------------------------------------- |
| IMP-101 | A16 | 片型分类 `track: lite | studio`（规则+LLM）         | `film-type-classifier.ts`                       | ⬜   |      | [演进对照 §七](./LocalCanvas_Agent-演进对照.md#七片型分类与升舱规则修订)           |
| IMP-102 | A16 | Studio 轨道禁止 3 节点 auto 推荐                    | `workflow-planner` · 模板召回                       | ⬜   |      | 验收 ST-01                                                      |
| IMP-103 | A17 | **ProductionBrief 卡** + CP0 HITL 确认         | `AgentBriefCard.tsx`                            | ⬜   |      | [UI §3.11](./LocalCanvas_Agent-UI设计.md#311-复杂片型-ui-studio-轨道) |
| IMP-104 | A18 | **Shot List** 完整预览 + 时长预算校验                 | `AgentShotList.tsx` · `shotSpecToScriptRows.ts` | ⬜   |      | block/warn [§三](./LocalCanvas_Agent-演进对照.md#三shotspec-落盘契约)   |
| IMP-105 | A19 | `buildProductionPlan`                       | `build-production-plan.ts`                      | ⬜   |      |                                                               |
| IMP-106 | A19 | `applyProductionPlan` + skeleton 落盘         | `applyProductionPlan.ts`                        | ⬜   |      | 验收 ST-03                                                      |
| IMP-107 | A20 | ShotSpec → `scriptRows` + `productionMeta`  | `shotSpecToScriptRows.ts`                       | ⬜   |      | 单测必填                                                          |
| IMP-108 | A03 | 规划器注入 **ShotSpec schema** + 片型 few-shot     | `workflow-planner.ts`                           | ⬜   |      |                                                               |
| IMP-109 | —   | 片型模板 `brand-spot-30s`                       | `WorkflowTemplateRegistry`                      | ⬜   |      |                                                               |
| IMP-110 | —   | 片型模板 `narrative-short`                      | `WorkflowTemplateRegistry`                      | ⬜   |      |                                                               |
| IMP-111 | A05 | `ProductionPlan` 类型                         | `src/types/agent.ts`                            | ⬜   |      |                                                               |
| IMP-112 | —   | UI `ProductionPlanPreview`                  | `ProductionPlanPreview.tsx`                     | ⬜   |      |                                                               |
| IMP-113 | A06 | Studio **禁用全片一条 auto DAG**                  | `useDagRun` · 计划解析                              | ⬜   |      |                                                               |
| IMP-120 | A01 | 会话存 `productionPlan` / `lastProductionPlan` | `agent-session-repository`                      | ⬜   |      | P1，可晚于 IMP-105                                                |


---

## 六、v12.1 — Wave 2（展开与一致性）


| 序号      | 能力  | 功能项                                  | 主要代码路径                       | 状态  | 完成日期 | 备注     |
| ------- | --- | ------------------------------------ | ---------------------------- | --- | ---- | ------ |
| IMP-121 | A25 | IPC `agent:expandShots`（≤6 镜）        | `electron/main/ipc/agent.ts` | ⬜   |      |        |
| IMP-122 | A23 | `creativeBible` → `project.metadata` | `project` 元数据写入              | ⬜   |      | V12-R5 |
| IMP-123 | —   | 片型模板 `product-demo`                  | `WorkflowTemplateRegistry`   | ⬜   |      |        |
| IMP-124 | —   | 片型模板 `montage-broll`                 | `WorkflowTemplateRegistry`   | ⬜   |      |        |
| IMP-125 | A24 | 多 Take + 分镜「**设为选用**」                | 分镜组 · 历史                     | ⬜   |      | P2     |


---

## 七、v12.2 — Wave 3（长片与 DAG）


| 序号      | 能力  | 功能项                         | 主要代码路径                 | 状态  | 完成日期 | 备注                     |
| ------- | --- | --------------------------- | ---------------------- | --- | ---- | ---------------------- |
| IMP-131 | A08 | 叙事片 **Scene 分组 checkpoint** | `useDagRun` · `stopAt` | ⬜   |      | 依赖 v11.1 最小 checkpoint |
| IMP-132 | —   | 时长预算 **自动 rebalance** 建议    | Agent 对话 + Shot List   | ⬜   |      | P2                     |
| IMP-133 | A24 | compose 默认引用 **选用版** 视频     | `compose` 节点           | ⬜   |      | P2                     |
| IMP-134 | —   | ST 冒烟纳入 **CI / nightly**    | `e2e/` 或 vitest        | ⬜   |      | 可选                     |


---

## 八、验收与测试矩阵


| 序号      | 测试 ID | 场景                                             | 归属切片  | 状态  | 完成日期       | 备注                         |
| ------- | ----- | ---------------------------------------------- | ----- | --- | ---------- | -------------------------- |
| IMP-T01 | ST-01 | 30s 品牌意图 → studio，无 3 节点 auto                  | v12.0 | ⬜   |            |                            |
| IMP-T02 | ST-02 | Shot 总时长超 target 15% → block                   | v12.0 | ⬜   |            |                            |
| IMP-T03 | ST-03 | skeleton 落盘：N 行 scriptRows，storyboard 空 frames | v12.0 | ⬜   |            |                            |
| IMP-T04 | ST-04 | 脚本→转分镜组：frames === scriptRows                  | v12.0 | ⬜   |            |                            |
| IMP-T05 | ST-05 | Handoff ① → 选中 script + Dock                   | v11.1 | ⬜   |            |                            |
| IMP-T06 | ST-06 | Build patch 加 video，锚定 image 仍在                | v11.1 | ⬜   |            |                            |
| IMP-T07 | ST-07 | checkpoint 计划确认后不自动 startRun                   | v11.1 | ⬜   |            |                            |
| IMP-T08 | ST-08 | preferences 迁移：旧 disabled-skills 仍生效           | v11.0 | ✅   | 2026-06-10 | `agentPreferences.test.ts` |
| IMP-T09 | QA-05 | v5 附录 A Agent P1 跑表 ≥80%                       | v11.0 | ⬜   |            | 同 IMP-012                  |


### 单测清单（v12 DoD）


| 序号      | 项                                              | 状态  | 完成日期 | 备注  |
| ------- | ---------------------------------------------- | --- | ---- | --- |
| IMP-U01 | `shotSpecToScriptRows` 映射 + clamp + block/warn | ⬜   |      |     |
| IMP-U02 | `film-type-classifier` studio/lite 打分          | ⬜   |      |     |
| IMP-U03 | `applyProductionPlan` skeleton 节点数             | ⬜   |      |     |
| IMP-U04 | `parseProductionPlan` / session 往返             | ⬜   |      |     |


---

## 九、变更日志


| 日期         | 变更                                                   |
| ---------- | ---------------------------------------------------- |
| 2026-06-10 | 初版：65 条 IMP + 9 验收 + 4 单测；基线 A01–A07 标为已有            |
| 2026-06-10 | v11.0 Slice A 代码：IMP-001～011、IMP-T08 ✅；IMP-012 跑表待手工 |
| 2026-06-10 | v11.1 Slice B：GraphPatch、Plan/Build、Handoff、checkpoint；IMP-T05～07 ✅ |
| 2026-06-10 | IMP-012 / IMP-T09 跑表完成（用户确认） |


---

## 相关文档

- [演进对照](./LocalCanvas_Agent-演进对照.md) — 能力 A01–A26、契约、Handoff
- [v11 版本规划](./LocalCanvas_v11_Agent与设置增强.md)
- [v12 版本规划](../v12/LocalCanvas_v12_Studio复杂片与Agent深化.md)
- [Agent 功能设计](./LocalCanvas_Agent功能设计.md)
- [Agent UI 设计](./LocalCanvas_Agent-UI设计.md)


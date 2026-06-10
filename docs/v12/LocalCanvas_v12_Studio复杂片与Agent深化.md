# LocalCanvas v12 — Studio 复杂片与 Agent 深化

> **版本目标**：落地 **Studio 轨道** — ProductionPlan、Brief/Shot List HITL、片型模板落盘、多 Take 选优  
> **状态**：⬜ 规划（设计已在 v11 详案中完成，本版负责 **实现与验收**）  
> **前置**：[v11 Agent 与设置增强](../v11/LocalCanvas_v11_Agent与设置增强.md) Slice A–C 收官（模板召回、Handoff、Preferences）  
> **设计源**（不重复造文档，实现时以以下为准）：
> - [复杂片型生产模型](../v11/LocalCanvas_Agent-复杂片型生产模型.md)
> - [Agent 功能设计 § Slice D](../v11/LocalCanvas_Agent功能设计.md#slice-d--v12studio-复杂片)
> - [演进对照](../v11/LocalCanvas_Agent-演进对照.md)（能力表 A16–A25、§三落盘契约、ST 测试）

---

## 一、版本定位

### 1.1 v11 与 v12 的分工

| 维度 | v11 | v12 |
|------|-----|-----|
| Agent 角色 | Copilot **基础设施**：设置、召回、Handoff、Build 补丁 | Copilot **生产能力**：品牌片/短片 **可规划、可落盘、可验收** |
| 主产物 | `WorkflowPlan`（Lite） | `ProductionPlan`（Studio） |
| 用户路径 | 三节点 auto + skeleton 手动 | Brief → Shot List → skeleton 一键落盘 |
| 文档 | 功能/UI/演进 **设计完成** | **本版本文档 + 实现 + ST 冒烟** |

v11 文中 **Slice D = v12 范围**；此前未单独建 v12 文档，易造成「有版本号、无版本规划」的错觉。本文档补齐该缺口。

### 1.2 成功标准（版本级）

| ID | 目标 |
|----|------|
| V12-R1 | Studio 意图（30s 品牌片）走 ProductionPlan，**不出现** 3 节点 auto 跑全片 |
| V12-R2 | [演进对照 ST-01～ST-08](../v11/LocalCanvas_Agent-演进对照.md#八测试矩阵扩展) 自动化 ≥7/8 通过 |
| V12-R3 | `buildProductionPlan` + `applyProductionPlan` 单测覆盖时长 block、skeleton 落盘 |
| V12-R4 | Brief / Shot List / Production 预览 UI 在钉住侧栏（320–400px）可用 |
| V12-R5 | `creativeBible` 写入 `project.metadata`，换会话不丢 |

---

## 二、功能清单

### Wave 1 — v12.0（ProductionPlan 核心）

| # | 能力 ID | 项 | 优先级 |
|---|---------|-----|--------|
| 1 | A16 | 片型分类（规则+LLM）`track: lite \| studio` | P0 |
| 2 | A17 | ProductionBrief 卡 + CP0 HITL 确认 | P0 |
| 3 | A18 | Shot List 预览 + 时长预算校验（§三） | P0 |
| 4 | A19 | `buildProductionPlan` / `applyProductionPlan` | P0 |
| 5 | A20 | ShotSpec → `scriptRows` + `productionMeta` | P0 |
| 6 | A03 | LLM 规划器注入 ShotSpec schema + 片型 few-shot | P0 |
| 7 | — | 片型模板 `brand-spot-30s`、`narrative-short`（skeleton） | P0 |
| 8 | — | `agent_sessions` 存 `productionPlan` / `lastProductionPlan` | P1 |
| 9 | — | UI：`ProductionPlanPreview`、`AgentBriefCard`、`AgentShotList`、`AgentPhaseRail` | P0 |

### Wave 2 — v12.1（展开与一致性）

| # | 能力 ID | 项 | 优先级 |
|---|---------|-----|--------|
| 10 | A25 | `agent:expandShots`（≤6 镜 per-shot 子图） | P1 |
| 11 | A23 | `creativeBible` → `project.metadata` | P1 |
| 12 | — | 片型模板 `product-demo`、`montage-broll` | P1 |
| 13 | — | `ref-sheet` 生产模式 + 参考图端口校验 | P1 |
| 14 | A24 | 多 Take：`takesPerShot` + 分镜「设为选用」 | P2 |

### Wave 3 — v12.2（长片与 DAG）

| # | 项 | 优先级 |
|---|-----|--------|
| 15 | 叙事片 Scene 分组 checkpoint（每场景末暂停） | P1 |
| 16 | 时长预算自动 rebalance（warn 时 Agent 建议删镜/改时长） | P2 |
| 17 | compose 默认引用选用版视频片段 | P2 |
| 18 | ST 冒烟纳入 CI（可选 nightly） | P2 |

---

## 三、不在 v12

- 超分 / 插帧 / ComfyUI 后期链（见复杂片专章 §十一）
- 云端 Agent、模板商店
- 视觉评分 autorepair（Comfy-Cozy 式）
- 独立审片窗口（沿用分镜组 + 历史）
- 全片一条 auto DAG（Studio 永久禁止）

---

## 四、技术要点（实现索引）

| 主题 | 规格位置 |
|------|----------|
| ShotSpec 映射 | [演进对照 §三](../v11/LocalCanvas_Agent-演进对照.md#三shotspec-落盘契约) |
| skeleton 节点图 | [演进对照 §3.4](../v11/LocalCanvas_Agent-演进对照.md#34-skeleton-落盘图studio-默认) |
| CP / ST 阶段 | [演进对照 §二](../v11/LocalCanvas_Agent-演进对照.md#二统一阶段枚举) |
| Handoff（v11.1 已有） | [演进对照 §五](../v11/LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航) |
| Brief/Shot UI | [Agent UI §3.11](../v11/LocalCanvas_Agent-UI设计.md#311-复杂片型-ui-studio-轨道) |
| 片型 Beat 结构 | [复杂片型 §五](../v11/LocalCanvas_Agent-复杂片型生产模型.md#五复杂片型模板workflowtemplateregistry-扩展) |

### 4.1 新增 / 扩展代码（计划）

| 路径 | 说明 |
|------|------|
| `src/types/agent.ts` | `ProductionPlan`、`ProductionBrief`、`ShotSpec` |
| `src/types/project.ts` 或 metadata | `creativeBible`、`agentHandoff` |
| `electron/utility/services/agent/build-production-plan.ts` | 片型模板 → ProductionPlan |
| `electron/utility/services/agent/film-type-classifier.ts` | Lite/Studio 打分 |
| `src/utils/applyProductionPlan.ts` | 包装 applyWorkflowPlan + scriptRows 写入 |
| `src/utils/shotSpecToScriptRows.ts` | §三映射 + 时长校验 |
| `src/components/agent/ProductionPlanPreview.tsx` | Studio 预览卡 |
| `src/components/agent/AgentBriefCard.tsx` | CP0 |
| `src/components/agent/AgentShotList.tsx` | CP1 |
| `electron/main/ipc/agent.ts` | `expandShots`、响应 `productionPlan` |

---

## 五、验收与测试

### 5.1 Studio 冒烟（DoD）

见 [演进对照 ST-01～ST-08](../v11/LocalCanvas_Agent-演进对照.md#八测试矩阵扩展)。

### 5.2 单测（最低）

- `shotSpecToScriptRows`：映射、duration clamp、block/warn
- `film-type-classifier`：品牌 30s → studio；5s 空镜 → lite
- `applyProductionPlan`：skeleton 节点数、storyboard.frames 为空
- `parseProductionPlan` / session 往返

### 5.3 手工场景

复杂片专章 [场景 D–G](../v11/LocalCanvas_Agent-复杂片型生产模型.md#七典型复杂场景取代简单咖啡宣传片单线) 各走通一条主路径。

---

## 六、与路线图关系

```
v10 收官 → v11 Agent 基建（Slice A–C）→ v12 Studio 产能（本文档 Wave 1–3）
                                              ↓
                                    v13+ 见功能设计「演进备忘」
```

**v13+ 候选**（信号触发，无独立文档）：语义模板召回 embedding、计划局部 diff 编辑器、团队 Rules 同步——见 [Agent 功能设计 §十](../v11/LocalCanvas_Agent功能设计.md#十演进备忘v12-信号触发)。

---

## 七、本版本文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 版本规划（本文） | [LocalCanvas_v12_Studio复杂片与Agent深化.md](./LocalCanvas_v12_Studio复杂片与Agent深化.md) | 实现范围与 DoD |
| 设计（继承 v11） | [v11/](../v11/) Agent 功能/UI/复杂片/演进对照 | **不重写**，v12 只增补实现笔记时可放 `v12/notes/` |

*v12 实现阶段可在 `v12/` 下追加 `qa-run.md`、`implementation-notes.md` 等归档，格式对齐 v10。*

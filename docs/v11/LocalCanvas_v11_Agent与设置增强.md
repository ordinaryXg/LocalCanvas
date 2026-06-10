# LocalCanvas v11 — Agent 与设置增强



> **版本目标**：Agent 体验专项 + Settings Agent 分区 + 相关 QA  

> **状态**：⬜ 规划 · 自 v10 Wave E 迁入  

> **前置**：v10 收官（EditorShell 单路径、Settings 四 Tab 非 Agent 区）  

> **演进对照**：[LocalCanvas_Agent-演进对照.md](./LocalCanvas_Agent-演进对照.md)（能力—代码表 · ShotSpec 契约 · Handoff · v11.0 范围收紧）



---



## 一、自 v10 迁入项



| 原 ID | 项 | v10 状态 | v11 目标 |

|-------|-----|----------|----------|

| — | Settings **Agent 专 Tab** | 自 v10 移除入口 | 独立 Tab + AgentPreferences |

| — | Settings Agent Skill 勾选 | 自 v10 移除 | 迁入 Agent Tab（模板开关，兼容旧 key） |

| T10-QA-05 | v5 P1 Agent 跑表 | 待 v11 | ≥80%，见 [v5 附录 A](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) |

| T10-EXE-05 | Agent LLM 配置说明 | account-guide 已有 | Agent Tab + agent-guide 联调 |

| — | AgentCompanion 打磨 | v8 部分完成 | Drawer 协同、Handoff（v11.1） |



---



## 二、v11 交付切片（与代码对齐）



> 能力 ID 见 [演进对照 §一](./LocalCanvas_Agent-演进对照.md#一能力--版本--代码对照表)



### Slice A — v11.0（P0，可发布）



| 能力 | 项 |

|------|-----|

| A09 | `SettingsAgentTab` + 就绪卡 + AgentPreferences |

| A10 | 模板召回卡片（替代 Skill 静默命中） |

| A14 | `openSettings({ tab, focus })` 深链接 |

| A04 | blocking 警告 → 去配置 |

| A02 | `WorkflowTemplateRegistry` 内部统一（行为兼容 v5 Skill） |

| — | v5 P1 跑表 ≥80%、agent-guide 更新 |



**不在 v11.0**：Brief 确认流、Shot List 落盘、GraphPatch、checkpoint 运行时、ProductionPlan。



### Slice B — v11.1（P1）



| 能力 | 项 |

|------|-----|

| A12 | `GraphPatch` + 预览 |

| A13 | Focused Nodes 芯片 |

| A08 | checkpoint **最小**：Studio 确认后不自动 `startRun` |

| A22 | Studio Handoff 导航条 |

| A11 | Plan/Build 路由生效 |



### Slice C — v11.2（P2）



| 能力 | 项 |

|------|-----|

| — | 阶段状态条、Brief 只读可编辑字段、Phase Rail（CP0–CP3） |

| A15 | AgentCompanion / Toast 审计 |

| — | DAG 面板「继续」paused run（可选） |



### Slice D — 迁至 v12（Studio 复杂片）

> **v12 独立版本文档**：[LocalCanvas_v12_Studio复杂片与Agent深化.md](../v12/LocalCanvas_v12_Studio复杂片与Agent深化.md)（根索引：[../LocalCanvas_v12_Studio复杂片与Agent深化.md](../LocalCanvas_v12_Studio复杂片与Agent深化.md)）。  
> 设计仍在 `v11/`；v12 负责 ProductionPlan 实现与 ST 验收。见 [演进对照 §九](./LocalCanvas_Agent-演进对照.md#九文档与实现顺序建议)、[复杂片型专章](./LocalCanvas_Agent-复杂片型生产模型.md)。



---



## 三、设计文档索引



| 文档 | 内容 |

|------|------|

| [Agent 功能设计](./LocalCanvas_Agent功能设计.md) | 架构、双模式、HITL、Slice |

| [Agent UI 设计](./LocalCanvas_Agent-UI设计.md) | 设置 Tab、对话窗、Handoff UI |

| [复杂片型生产模型](./LocalCanvas_Agent-复杂片型生产模型.md) | 片型、七阶段、场景 D–G |

| [演进对照](./LocalCanvas_Agent-演进对照.md) | **实现真相表**、落盘契约、导航 |
| [v12 版本规划](../v12/LocalCanvas_v12_Studio复杂片与Agent深化.md) | Slice D 实现范围、Wave、ST DoD |
| [**实现进度统计表**](./LocalCanvas_Agent-实现进度统计表.md) | **逐项更新实现状态** |



---



## 四、代码触点（已校正）



| 路径 | 说明 |

|------|------|

| `electron/utility/services/agent/agent-service.ts` | chat、Skill、LLM 规划 |

| `electron/utility/services/agent/skills/*` | 模板源（待并入 registry） |

| `electron/main/ipc/agent.ts` | Agent IPC |

| `electron/main/repositories/agent-session-repository.ts` | 会话 |

| `src/components/panels/AgentPanel.tsx` | 对话、落盘、Handoff |

| `src/components/agent/AgentCompanion.tsx` | 浮岛/钉住 |

| `src/components/panels/SettingsAgentTab.tsx` | **待建** |

| `src/hooks/useDagRun.ts` | DAG（无 checkpoint stopAt，v11.1 补） |

| `src/utils/applyWorkflowPlan.ts` | 计划落画布 |

| `src/utils/parseWorkflowPlan.ts` | 仅 `auto\|manual`，v11.1 扩展 |

| `src/stores/editorShellStore.ts` | 设置门、workbench 跳转 |



---



## 五、不在 v11



- 云端 Agent / 多用户协作  

- Skill 商店或远程模板拉取  

- v12 前：ProductionPlan 完整落盘、多 Take 选优、creativeBible 持久化  



---



*v11 待办源；实现范围以 [演进对照 §1.2](./LocalCanvas_Agent-演进对照.md#12-v110-范围收紧与详案对齐) 为准。*


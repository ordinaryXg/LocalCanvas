# LocalCanvas v11 — Agent 与设置增强

> **版本目标**：Agent 体验专项 + Settings Agent 分区 + 相关 QA  
> **状态**：⬜ 规划 · 自 v10 Wave E 迁入  
> **前置**：v10 收官（EditorShell 单路径、Settings 四 Tab 非 Agent 区）

---

## 一、自 v10 迁入项

以下原属 v10 范围，现 **推迟至 v11** 实施：

| 原 ID | 项 | v10 状态 | v11 目标 |
|-------|-----|----------|----------|
| — | Settings **Agent 专 Tab** | 自 v10 移除入口 | 独立 Tab：默认 Agent LLM、Skill 开关、会话偏好 |
| — | Settings Agent Skill 勾选 | 自 v10 设置页移除 | 迁入 Agent Tab + 与 `lc-agent-disabled-skills` 对齐 |
| T10-QA-05（Agent 类） | v5 P1 跑表 · Agent 用例 | 待 v11 手工 | 见 [v5 附录 A](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) |
| T10-EXE-05 扩展 | Agent LLM 配置说明 | v10 已有 [account-guide](../v5/account-guide.md) | Agent 专章 + Settings Tab 联调文档 |
| — | AgentCompanion 打磨 | v8 P1 部分完成 | 浮岛阅读率、钉住、与 Drawer 协同 |

## 二、v11 功能清单（草案）

| # | 模块 | 说明 | 优先级 |
|---|------|------|--------|
| 1 | Settings Agent Tab | 默认 LLM、Skill 启用/禁用、引导 copy | P0 |
| 2 | Agent 跑表 | v5 P1 Agent 类用例 ≥80% | P0 |
| 3 | Agent 文档 | `docs/v5/agent-guide.md` 与设置页交叉链接 | P1 |
| 4 | AgentCompanion | 会话持久化、错误 Toast 统一审计 | P2 |

## 三、代码触点

| 路径 | 说明 |
|------|------|
| `src/components/panels/AgentPanel.tsx` | 对话与计划落画布 |
| `src/components/shell/AgentCompanion.tsx` | 浮岛壳层（若有） |
| `electron/main/services/agent-service.ts` | Skill / chat IPC |
| `SettingsPanel` | v11 新增 `agent` Tab |

## 四、不在 v11

- 云端 Agent / 多用户协作  
- Skill 商店或远程 Skill 拉取  

---

*v11 待办源；v10 文档中 Agent 类条目以本文为准。*

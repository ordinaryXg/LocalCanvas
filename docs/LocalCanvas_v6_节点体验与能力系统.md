# LocalCanvas v6 — 节点体验打磨 + 模型能力系统

> **版本目标**：合成剪辑台、文本双栏、模型能力 Registry 三大重设计落地  
> **周期**：2.5 周 · **状态**：✅ 核心已验收  
> **详案**：[v6/LocalCanvas_v6_节点体验与能力系统.md](./v6/LocalCanvas_v6_节点体验与能力系统.md)

---

## 核心交付

| 模块 | 要点 |
|------|------|
| 合成剪辑台 | 连线同步 clips、时间轴、导出 MP4 |
| 文本节点 | 草稿/输出分离、LLM 生成不写 draft |
| 能力系统 | Profile Registry、虚线边警告、生成前阻断、Agent 选模 |
| 动态 UI | 按 profile 动态端口与生成器参数 |

## 验收摘要

- 合成 5 分钟连线→导出；文本 output 语义清晰
- 非法连线可读 reason；`npm test` + `npm run build` 全绿

## 本版本文档

| 文档 | 路径 |
|------|------|
| 完整详案 + 任务总表 | [v6/LocalCanvas_v6_节点体验与能力系统.md](./v6/LocalCanvas_v6_节点体验与能力系统.md) |
| 合成编辑器重设计 | [v6/design/LocalCanvas_合成编辑器重设计.md](./v6/design/LocalCanvas_合成编辑器重设计.md) |
| 文本节点重设计 | [v6/design/LocalCanvas_文本节点重设计.md](./v6/design/LocalCanvas_文本节点重设计.md) |
| 模型能力系统重设计 | [v6/design/LocalCanvas_模型能力系统重设计.md](./v6/design/LocalCanvas_模型能力系统重设计.md) |
| 能力系统实施记录 | [附录 D](./v6/design/LocalCanvas_模型能力系统重设计.md#附录-d实施记录2026-06-05) |

**开发步骤**：[开发步骤表 · Phase 6](./LocalCanvas_开发步骤表.md#phase-6节点体验--模型能力系统v6-客户端约-25-周)

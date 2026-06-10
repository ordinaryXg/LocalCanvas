# LocalCanvas v10 — 冗余清除与技术债归零

> **版本目标**：**冗余代码清除** + **技术债归零** — 单路径可维护，§一 无遗留  
> **周期**：3 周（5 Wave）· **状态**：🔶 Wave C 进行中（A ✅ · B 🔶 · C 🔶）  
> **详案**：[v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md)

---

## 两大主线

| 主线 | 要点 | 进度 |
|------|------|------|
| **冗余代码清除** | Legacy 移除（ADR-001）、双轨收敛、死代码/死依赖、5 大文件拆分 | Wave A ✅ · Wave B 🔶 |
| **技术债归零** | §三 剩余项全部 ✅；v5 附录 A P1 跑表 ≥80% | Wave C 🔶（P1 剩 CAP-03） |

## 成功标准（摘要）

| ID | 目标 | 状态 |
|----|------|------|
| V10-R0 | 主路径无 Legacy / 零引用死代码 | 🔶 ENG-14 部分 |
| V10-R1 | §三 50 项债务全 ✅ | 🔶 26 项待关 |
| V10-R4 | v5 附录 A P1 ≥80%，跑表归档 | 🔶 |
| V10-R5 | ADR-001 Legacy 移除落地 | ✅ |

## 本版本文档

| 文档 | 路径 |
|------|------|
| 完整债务表 + 双主线 Wave + ADR | [v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md) |
| 文本节点迁移 | [v10/text-node-migration.md](./v10/text-node-migration.md) |
| 包体审计 | [v10/v10-bundle-audit.md](./v10/v10-bundle-audit.md) |
| P1 跑表 | [v10-qa-run.md](./v10-qa-run.md) |

**关联**：[v9 收官](./LocalCanvas_v9_精简优化与体验收官.md) · [v5 测试用例 · 附录 A](./v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例)

```bash
npm test                # 212 passed（2026-06-10）
npm run build           # ✅
rg "LegacyAppLayout|GeneratorPanel|GenerateMode" src/   # 0 匹配
```

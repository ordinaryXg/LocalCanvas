# LocalCanvas v10 — 冗余清除与技术债归零

> **版本目标**：**冗余代码清除** + **技术债归零** — 单路径可维护，§一 无遗留  
> **周期**：3 周（5 Wave）· **状态**：🔶 进行中  
> **详案**：[v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md)

---

## 两大主线

| 主线 | 要点 |
|------|------|
| **冗余代码清除** | Legacy 移除（ADR-001）、双轨收敛、死代码/死依赖、5 大文件拆分 |
| **技术债归零** | §一 剩余 **43** 项全部 ✅；v5 附录 A P1 跑表 ≥80% |

## 成功标准（摘要）

| ID | 目标 |
|----|------|
| V10-R0 | 主路径无 Legacy / 零引用死代码（`rg` 审计通过） |
| V10-R1 | §一 50 项债务全 ✅，无 ⬜/🔶 |
| V10-R4 | v5 附录 A P1 ≥80% 通过，跑表归档 `docs/v10-qa-run.md` |
| V10-R5 | ADR-001 Legacy 移除落地 |

## 本版本文档

| 文档 | 路径 |
|------|------|
| 完整债务表 + 双主线 Wave + ADR | [v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md) |

**关联**：[v9 收官](./LocalCanvas_v9_精简优化与体验收官.md) · [v5 测试用例 · 附录 A](./v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) · [v9 包体报告](./v9/v9-bundle-size-report.md)

```bash
npm test                # 210 passed（v9 Wave 5 基线）
rg "LegacyAppLayout|GeneratorPanel|GenerateMode" src/
```

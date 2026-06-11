# LocalCanvas 文档目录

> **约定**：根目录 `LocalCanvas_vN_*.md` 为**版本索引**（摘要 + 链接）；`docs/vN/` 为**详案与归档**。

---

## 目录结构

```
docs/
├── README.md                          # 本说明
├── LocalCanvas_开发步骤表.md           # 跨版本 Phase 拆解
├── LocalCanvas_v1_*.md … v12_*.md     # 各版本索引（根目录）
├── v1/ … v12/                         # 版本详案目录
│   ├── LocalCanvas_vN_*.md            # 完整版本文档
│   ├── design/                        # 设计专文（v6、v8）
│   └── *.md                           # 验收归档、用户指南等
```

## 版本索引 → 详案

| 版本 | 索引（根目录） | 详案目录 |
|------|----------------|----------|
| v1 | [LocalCanvas_v1_画布基础与节点系统.md](./LocalCanvas_v1_画布基础与节点系统.md) | [v1/](./v1/) |
| v2 | [LocalCanvas_v2_模型配置与生成器系统.md](./LocalCanvas_v2_模型配置与生成器系统.md) | [v2/](./v2/) |
| v3 | [LocalCanvas_v3_视频合成与项目打磨.md](./LocalCanvas_v3_视频合成与项目打磨.md) | [v3/](./v3/) |
| v4 | [LocalCanvas_v4_完善高级功能与发布.md](./LocalCanvas_v4_完善高级功能与发布.md) | [v4/](./v4/) |
| v5 | [LocalCanvas_v5_Agent自动化与分镜增强.md](./LocalCanvas_v5_Agent自动化与分镜增强.md) | [v5/](./v5/) |
| v6 | [LocalCanvas_v6_节点体验与能力系统.md](./LocalCanvas_v6_节点体验与能力系统.md) | [v6/](./v6/) · [design/](./v6/design/) |
| v7 | — | [v7/README.md](./v7/README.md)（未单独发版） |
| v8 | [LocalCanvas_v8_界面与体验重设计.md](./LocalCanvas_v8_界面与体验重设计.md) | [v8/](./v8/) · [design/](./v8/design/) |
| v9 | [LocalCanvas_v9_精简优化与体验收官.md](./LocalCanvas_v9_精简优化与体验收官.md) | [v9/](./v9/) |
| v10 | [LocalCanvas_v10_项目优化与技术债归集.md](./LocalCanvas_v10_项目优化与技术债归集.md) | [v10/](./v10/) |
| v11 | [LocalCanvas_v11_Agent与设置增强.md](./LocalCanvas_v11_Agent与设置增强.md) | [v11/](./v11/) · Agent 设计详案 |
| v12 | [LocalCanvas_v12_Studio复杂片与Agent深化.md](./LocalCanvas_v12_Studio复杂片与Agent深化.md) | [v12/](./v12/) · 继承 v11 设计，负责 Studio 实现 |

## Agent 实现进度（活文档）

| 文档 | 说明 |
|------|------|
| [LocalCanvas_Agent-实现进度统计表.md](./LocalCanvas_Agent-实现进度统计表.md) | 根索引 |
| [v11/LocalCanvas_Agent-实现进度统计表.md](./v11/LocalCanvas_Agent-实现进度统计表.md) | **逐项更新进度**（IMP-* / ST-* / QA） |
| [v11/LocalCanvas_v11_验收跑表.md](./v11/LocalCanvas_v11_验收跑表.md) | **v11 手工验收表格**（Slice A/B/C） |

## 用户指南（按版本目录）

| 文档 | 路径 |
|------|------|
| 模型配置 | [v2/model-config.md](./v2/model-config.md) |
| 工作流模板 | [v4/workflow-templates.md](./v4/workflow-templates.md) |
| Agent 指南 | [v5/agent-guide.md](./v5/agent-guide.md) |
| 账号说明 | [v5/account-guide.md](./v5/account-guide.md) |
| v5 测试用例 · 附录 A | [v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例](./v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) |

## v10 归档（均在 `v10/`）

| 文档 | 说明 |
|------|------|
| [qa-run.md](./v10/qa-run.md) | P1 跑表 |
| [main-deps-audit.md](./v10/main-deps-audit.md) | main 依赖审计 |
| [bundle-audit.md](./v10/bundle-audit.md) | xyflow 包体审计 |
| [text-node-migration.md](./v10/text-node-migration.md) | 文本节点 legacy 迁移 |
| [layout-1280.md](./v10/layout-1280.md) | 1280×720 验收 |
| [image-drawer-1080p.md](./v10/image-drawer-1080p.md) | 图片 Drawer 1080p |
| [perf-100nodes.md](./v10/perf-100nodes.md) | 100 节点性能 |

## 命名规则

- 根索引：`LocalCanvas_v{N}_{主题}.md`
- 详案：`v{N}/LocalCanvas_v{N}_{主题}.md`（与索引同名，内容完整）
- 附属文档：放在对应 `v{N}/` 下，**不再**使用 `v10-` 前缀（目录已表明版本）
- 跨版本：根目录仅保留 `LocalCanvas_开发步骤表.md` 与版本索引

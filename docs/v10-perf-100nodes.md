# 100 节点画布性能简述

> Wave D · T10-QA-06 · 关联 T10-ENG-09/10

## 环境

- 日期：2026-06-10
- 节点：100（混合 text / image / video / storyboard group）
- 优化：`onlyRenderVisibleElements`、VideoNode 离屏 pause + blob revoke

## 观察

| 指标 | 优化前（估） | Wave C 后 |
|------|-------------|-----------|
| 初始 mount | 明显卡顿 | 可接受，视口外不渲染 |
| 平移/zoom | 掉帧 | 流畅 |
| 选中/Inspector | 偶发 lag | 窄 selector 后改善 |
| 内存（video 节点多） | blob 累积 | 离屏 revoke 后稳定 |

## 建议

- 超大项目（200+）仍建议分组 + 工作台分模块编辑。
- 后续可考虑边 compat 批量评估节流（T10-ENG-13 已加 profile 缓存）。

## 结论

100 节点规模下主交互可用，Wave C 视口优化达到归档标准。

# v10 P1 跑表记录（T10-QA-05）

> 生成日期：2026-06-10 · Wave C 基线  
> 用例来源：[v5 附录 A P1](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例)

## 自动化基线（Wave A/B 后）


| 检查项             | 结果        | 备注                  |
| --------------- | --------- | ------------------- |
| `npm test`      | ✅ 212/212 | 2026-06-10 Wave C   |
| `npm run build` | ✅         | electron-vite 通过    |
| Legacy 主路径      | ✅         | Wave A 移除，`rg` 0 匹配 |
| e2e smoke（5 条）  | 🔶        | 待 Wave E 全量复跑       |


## 手工 P1 跑表


| 类别       | 通过  | 失败  | 阻塞  | 待测  |
| -------- | --- | --- | --- | --- |
| 壳层 / 编辑器 | ✅   | —   | —   | 待填  |
| 节点 / 生成  | ✅   | —   | —   | 待填  |
| DAG / 分镜 | ✅   | —   | —   | 待填  |
| Agent    | —   | —   | —   | 待填  |


**当前通过率**：待手工补全（目标 ≥80%）

## Wave C 已修阻断项

- Legacy 双轨移除（EditorShell 单路径）
- `/style` Slash → GeneratorDrawer focus chips
- Token 语义层（`tokens.css`）
- 文本 legacy 加载迁移（`normalizeTextNodeData`）
- Dock 连线健康抽屉（T10-CAP-02）
- reasoning 折叠 + 管道（T10-CAP-04）
- 图片 reference1…4 端口（T10-CAP-05）
- DAG 崩溃恢复弹窗（T10-EXE-01）
- 视口外 video pause/revoke（T10-ENG-10）
- Canvas 窄 selector（T10-ENG-11）
- Settings catalog 版本展示（T10-CAP-03 部分）


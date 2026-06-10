# 图片 Generator Drawer — 1080p 零滚动验收

> Wave D · T10-UI-13

## 环境

- 显示器：1920×1080
- 窗口：最大化 EditorShell
- 组件：`ImageEditorPanel` + `GeneratorDrawer`

## 检查项

| 项 | 结果 |
|----|------|
| 提示词 + 模型选择 + 比例 + 生成按钮一屏可见 | ✅ |
| 预览区默认高度下无需滚动即可点「生成」 | ✅ |
| 1080p 下展开 StylePresetChips 仍可用（轻微滚动可接受） | ✅ |

## 调整

- 预览区使用 `max-h-[min(240px,28vh)]` 约束，避免占满 Drawer。

## 结论

1080p 主操作路径零滚动达标。

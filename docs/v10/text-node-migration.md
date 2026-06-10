# 文本节点 legacy 字段迁移

> Wave B · RED-06 / T10-ENG-06

## 新结构（唯一写入源）

| 字段 | 用途 |
|------|------|
| `draft` | 用户输入 / LLM 输入源 |
| `output` | 连线下游内容 |
| `outputMode` | `passthrough` \| `generated` |
| `outputEdited` | generated 模式下 output 是否手改 |
| `modelId` | LLM 模型 ID |

## Legacy 字段（只读兼容，加载时迁移）

| 旧字段 | 迁移目标 |
|--------|----------|
| `inputContent` | `draft` |
| `generatedContent` / `content` | `output` |
| `prompt` | `draft` 或 `output`（按内容推断） |
| `llmModel` | `modelId` |

## 迁移入口

- `canvasStore.loadProject` → `normalizeTextNodeData`
- `TextNode` 渲染、`useTextNodeData` → 运行时规范化
- `dagNodeExecutor` 文本分支 → `normalizeTextNodeData` 后再执行

## 验收

旧项目 JSON 含 legacy 字段时，打开后节点可编辑、DAG 可执行，保存后新字段生效。

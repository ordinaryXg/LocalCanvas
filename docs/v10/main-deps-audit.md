# v10 Main 进程依赖审计（T10-ENG-08 / RED-11）

> 生成日期：2026-06-10 · Wave E

## 结论

| 依赖 | 状态 | 说明 |
|------|------|------|
| `ws` | ✅ 已移除 | v10 Wave B 清理；无运行时引用 |
| `axios` | ✅ 保留 | main / utility 多模块 HTTP 客户端，暂无更轻量替换收益 |

## `axios` 引用面（生产代码）

| 模块 | 用途 |
|------|------|
| `capability-sync.ts` | L2 能力目录 HTTP 拉取 |
| `capability-probe.ts` | 模型端点探测 |
| `config.ts` | 连通性测试 |
| `model-adapter/custom.ts` | 自定义 REST 适配器 |
| `model-adapter/remote-api.ts` | OpenAI 兼容远程 API |
| `model-adapter/replicate.ts` | Replicate API |
| `model-adapter/seedance.ts` | Seedance API |
| `ffmpeg-download.ts` | FFmpeg 二进制下载 |
| `audio/vocal-separator.ts` | 人声分离 HTTP API |

**判定**：均为真实网络 I/O；合并为单一 fetch 封装属 v11+ 可选优化，非 v10 阻断项。

## Renderer 依赖

Renderer 不直接依赖 `axios`；HTTP 经 IPC 走 main / utility 进程。

## 复核命令

```bash
rg "from 'ws'|require\\('ws'\\)" electron/ src/
rg "from 'axios'|require\\('axios'\\)" electron/
npm test && npm run build
```

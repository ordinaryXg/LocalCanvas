# LocalCanvas

本地化 AI 视频创作画布工具

## 特性

- **无限画布** — 自由缩放、平移、节点式创作
- **多种节点** — 文本 / 图片 / 视频 / 音频 / 脚本 / 合成 / 分镜组
- **能力驱动连线** — 根据模型能力目录自动判断连线是否兼容；不兼容时显示虚线警告，生成前对关键入边做校验
- **模型可配置** — 通过 HTTP API 对接（OpenAI 兼容 / Seedance / Replicate / 自定义端点），内置能力目录与 L3 探测，无需本地 GPU
- **Agent 助手** — 自然语言描述意图，自动规划节点工作流并按能力选模；支持文生视频、首尾帧、脚本成片等技能
- **DAG 批量执行** — 选中节点组后按依赖顺序自动运行，底部面板显示进度
- **文本节点 v2** — 草稿 / 输出双栏编辑，支持思考档位与多图 Vision 输入
- **视频多参考图** — Seedance 2.0 支持最多 9 张参考图、首尾帧、参考音视频
- **脚本与分镜** — 输入故事梗概，AI 生成分镜并批量出图/出视频；分镜组支持九宫格 / 二十五宫格
- **合成剪辑台** — 时间线预览、裁切、混流、字幕与 MP4 导出
- **斜杠命令** — 画布按 `/` 唤起命令面板（整组执行、打开 Agent、分镜导出等）
- **生成历史** — SQLite 记录，支持搜索、筛选、一键复用
- **工作流模板** — 预置模板 + 保存 / 加载 / 导入导出
- **本地优先** — 数据保存在本机；可选游客模式或注册本地账号，API Key 仅存于用户数据目录

## 安装

### 开发环境

```bash
git clone https://github.com/ordinaryXg/LocalCanvas
cd LocalCanvas
npm install
npm run dev
```

### Windows 安装包

```bash
npm run build
npm run package:win
```

安装包输出至 `dist/release/`。

详细教程见 [快速入门指南](docs/quick-start.md)、[模型配置指南](docs/model-config.md) 与 [工作流模板](docs/workflow-templates.md)。

## 快速开始

1. 首次启动完成引导，配置 LLM 与火山方舟 API Key
2. 创建项目，双击画布添加文本节点，输入画面描述
3. 连线到图片节点，选择模型后点击「生成」
4. 将图片节点连线到视频节点，继续生成视频
5. 或打开侧边栏 **Agent**，用自然语言描述需求，确认计划后一键落盘

## 模型配置

推荐在应用内 **设置 → 模型与能力 → 已接入模型** 可视化添加预设并测试连接。也可直接编辑用户数据目录下的 `config.yaml`（路径可在设置中查看）。

支持的提供商：

- **OpenAI 兼容 API**：DeepSeek / GPT-4o / 通义 / Kimi / 火山方舟 Seedream 等
- **Seedance 视频**：Doubao Seedance 1.0 / 2.0 专用适配器
- **Replicate 云端模型**：填写 API Token 与模型版本 ID
- **自定义 HTTP 端点**：通过 `custom_config` 配置请求模板；系统会推断基础能力并支持「验证能力」探测

详见 [模型配置指南](docs/model-config.md)。

## 快捷键

| 操作 | Windows/Linux | Mac |
|------|--------------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
| 斜杠命令 | `/` | `/` |
| 平移画布 | 空格 + 拖拽 | 空格 + 拖拽 |
| 缩放 | 滚轮 | 滚轮 |
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Shift+Z | Cmd+Shift+Z |
| 打组 | Ctrl+G | Cmd+G |
| 删除 | Delete | Delete |
| 保存 | Ctrl+S | Cmd+S |

## 技术栈

- Electron 33 + React 19 + TypeScript
- React Flow 12（画布引擎）
- Zustand（状态管理）
- FFmpeg（视频处理）
- better-sqlite3（项目数据 + 生成历史）

## 文档

| 文档 | 说明 |
|------|------|
| [快速入门](docs/quick-start.md) | 安装、首次配置、第一次创作 |
| [模型配置](docs/model-config.md) | 提供商、能力目录、YAML 参考 |
| [工作流模板](docs/workflow-templates.md) | 预置模板与自定义工作流 |
| [Agent 指南](docs/agent-guide.md) | Agent 助手、技能、DAG 与斜杠命令 |
| [V6 开发文档](docs/LocalCanvas_v6_节点体验与能力系统.md) | 能力系统与节点体验设计 |

## License

MIT

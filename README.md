# LocalCanvas

本地化 AI 视频创作画布工具

## 特性

- **无限画布** — 自由缩放、平移、节点式创作
- **多种节点** — 文本 / 图片 / 视频 / 音频 / 脚本 / 合成
- **连线工作流** — 节点间数据流传递，自动化创作
- **模型可配置** — 通过 HTTP API 对接（OpenAI 兼容 / Seedance / Replicate / 自定义端点），无需本地 GPU 推理环境
- **脚本节点** — 输入故事梗概，AI 自动生成分镜并批量生成
- **视频合成** — 多片段拼接、裁取、混流、导出 MP4
- **生成历史** — SQLite 记录，支持搜索、筛选、一键复用
- **工作流模板** — 预置模板 + 保存 / 加载 / 导入导出
- **完全本地** — 无需登录，数据不离开你的电脑

## 安装

### 开发环境

```bash
git clone https://github.com/localcanvas/localcanvas
cd localcanvas
npm install
npm run dev
```

### Windows 安装包

```bash
npm run build
npm run package
```

安装包输出至 `dist/release/`。

详细教程见 [快速入门指南](docs/quick-start.md) 与 [模型配置指南](docs/model-config.md)。

## 快速开始

1. 首次启动完成引导，配置模型 API Key
2. 创建项目，双击画布添加文本节点，输入画面描述
3. 连线到图片节点，选择模型后点击「生成」
4. 将图片节点连线到视频节点，继续生成视频

## 模型配置

编辑用户数据目录下的 `config.yaml`（路径可通过设置面板查看），可配置：

- **OpenAI 兼容 API**：火山方舟 Seedream / 通义 / DeepSeek 等
- **Seedance 视频**：火山方舟 Doubao Seedance 2.0
- **Replicate 云端模型**：填写 API Token 与模型版本 ID
- **自定义 HTTP 端点**：通过 `custom_config` 配置请求模板与响应映射

## 快捷键

| 操作 | Windows/Linux | Mac |
|------|--------------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
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

## License

MIT

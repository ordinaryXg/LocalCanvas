# LocalCanvas

本地化 AI 视频创作画布工具 — 节点式工作流、能力驱动连线、Agent 辅助与本地合成导出。

> 使用远程 HTTP API（火山方舟 Seedream/Seedance、OpenAI 兼容、Replicate 等）进行 AI 生成，无需安装 ComfyUI 或其他本地推理环境。

## 特性

### 创作与画布

- **无限画布** — 自由缩放、平移；React Flow 可见区渲染，大项目更流畅
- **多种节点** — 文本 / 图片 / 视频 / 音频 / 脚本 / 分镜组 / 合成
- **能力驱动连线** — 按模型能力目录判断兼容性；不合规显示虚线警告，生成前校验入边
- **端口槽位** — 视频等多入边 handle 显示 `n/max` 占用
- **斜杠命令** — 画布按 `/` 唤起命令面板（整组执行、Agent、分镜导出、风格模板等）

### 编辑器壳层（v8+）

- **画布模式** — 主创作区 + 右侧 Inspector + 底部 Generator Drawer（选中可生成节点时展开）
- **工作台模式** — 顶栏切换；按选中节点自动进入：
  - **生成编辑**：左侧预览 / 中间参数面板 / 右侧生成历史
  - **剪辑台**：合成节点时间线、预览、导出
- **Dock 侧栏** — 节点、工具、资产、历史快速入口

### 生成与 Agent

- **模型可配置** — OpenAI 兼容 / Seedance / Seedream / Replicate / 自定义 HTTP；能力目录 + L3 探测
- **文本节点 v2** — 草稿 / 输出双栏，思考档位，多图 Vision 输入
- **图片 / 视频编辑器** — 大图预览、风格预设 Chips、参考图与首尾帧
- **视频多参考** — Seedance 2.0 最多 9 张参考图、首尾帧、参考音视频
- **脚本与分镜** — AI 分镜表；同步到画布、批量出图 / 出视频
- **Agent 助手** — 自然语言规划工作流，会话历史，技能选模
- **DAG 批量执行** — 依赖排序、同层并发、失败重试 / 跳过、执行到指定节点

### 合成与数据

- **合成剪辑台** — 时间线预览、裁切、背景音乐音量、字幕、MP4 导出（可取消）
- **生成历史** — SQLite 记录，搜索、筛选、复用
- **工作流模板** — 启动页预置模板写入项目图；支持保存 / 导入导出
- **本地优先** — 项目与资产在本机；可选游客或本地账号；API Key 仅存用户数据目录

## 安装

### 从安装包（推荐）

1. 下载并运行 `LocalCanvas Setup 0.1.0.exe`（Windows）或挂载 `.dmg`（macOS）
2. 首次启动进入引导向导，可选 **游客继续** 或注册本地账号

构建安装包：

```bash
npm run build
npm run package:win
```

产物目录：`dist/release/`

| 文件 | 说明 |
|------|------|
| `LocalCanvas Setup 0.1.0.exe` | NSIS 安装包（推荐） |
| `win-unpacked/LocalCanvas.exe` | 免安装绿色版 |

> 本地打包已在 `electron-builder.yml` 关闭代码签名（`signAndEditExecutable: false`）。正式发布需配置证书或开启 Windows 开发者模式后再签名。

### 从源码开发

```bash
git clone https://github.com/ordinaryXg/LocalCanvas
cd LocalCanvas
npm install
npm run dev
```

更多指南：[模型配置](docs/v2/model-config.md) · [工作流模板](docs/v4/workflow-templates.md) · [Agent 指南](docs/v5/agent-guide.md) · [账号说明](docs/v5/account-guide.md)

## 快速开始

### 首次配置

1. 在引导界面或 **设置 → 模型与能力 → 已接入模型** 中添加预设并填写 API Key
2. 推荐先添加：
   - 一个 **LLM** 预设（如 DeepSeek V4 Flash）— 用于文本、脚本与 Agent
   - **Seedream 4.5**（图像）与 **Seedance**（视频）— 火山方舟同一 API Key 通常可共用
3. 在模型卡片上点击 **测试** 确认连通；自定义端点可再点 **验证能力** 刷新能力缓存
4. 点击 **同步能力目录** 可拉取账户已开通、尚未添加的模型列表
5. 在 **设置 → 应用设置** 中配置默认模型、输出目录、FFmpeg（视频合成需要）及 Agent 技能开关

> 默认模型也可在「已接入模型」卡片上直接 **设为默认**。详见 [模型配置指南](docs/v2/model-config.md)。

### 第一次创作

**手动连线**

1. 开始页 **新建项目**（可选用预置工作流模板）
2. 双击画布空白处 → 创建 **文本节点**，在右侧生成面板输入画面描述
3. 从文本节点 `prompt` 拖线到 **图片节点** `prompt` → 选中图片节点 → 底部 **Generator Drawer** 打开 → 选模型与风格 → 生成
4. 将图片节点 `image` 连线到 **视频节点** `firstFrame` → 生成短视频
5. 多个视频连到 **合成节点** → 快捷键 `E` 或顶栏进入 **工作台 · 剪辑台** 导出
6. 项目每 30 秒自动保存，失焦时也会保存

**用 Agent 快速起步**

1. 打开侧边栏 **Agent** 标签（或画布按 `/` 输入 `/agent`）
2. 描述需求，例如：「帮我做一个 15 秒产品宣传短视频」
3. 预览 Agent 生成的工作流计划，确认后节点落到画布
4. Agent 按能力目录为各节点选择合适模型；可在计划中查看 `modelHint`

### 文本节点

选中文本节点后，右侧 **生成面板** 提供双栏编辑器：

| 区域 | 作用 |
|------|------|
| **草稿** | 你编写或粘贴的提示词，可手动编辑 |
| **输出** | LLM 生成结果；下游节点默认读取此处 |

- **思考档位** — 支持思考的模型（如 DeepSeek V4）可切换 关 / 均衡 / 深度
- **Vision 多图** — 将图片节点连到文本节点的 `image1` … `image20` 端口
- 不兼容的入边显示为 **虚线**；若虚线连到生成所依赖的关键端口，点击生成时会提示原因

### 视频与 Seedance 2.0

- **首帧 / 尾帧** — 分别连接 `firstFrame`、`lastFrame`；首尾帧过渡需 **Seedance 2.0** 系列模型
- **参考图** — Seedance 2.0 提供 `reference1` … `reference9`，最多 9 张参考图
- **参考音视频** — 可连接参考视频、参考音频端口（视模型能力而定）
- Seedance 1.0 不支持尾帧时，连到 `lastFrame` 的边会显示虚线并在生成时拦截

### 工作流模板

1. 打开侧边栏 **工具** 标签
2. 在 **工作流模板** 中选择预置模板（如「文生图 → 图生视频」）点击 **加载**
3. 选中多个节点 → `Ctrl+G` 打组 → 右键 **保存为工作流** 可保存自定义模板

详见 [工作流模板说明](docs/v4/workflow-templates.md)。

### 批量执行（DAG）

1. 选中一组已连线的节点（或打组后的节点组）
2. 画布按 `/` 输入 `/run`，或从上下文菜单触发 **整组执行**
3. 底部 **DAG 运行面板** 显示各节点 pending / running / completed / failed 状态
4. 依赖不满足或能力不匹配的节点会被跳过或失败，并给出原因

### 合成剪辑台

1. 添加多个 **视频节点** 并生成片段（或拖入本地素材）
2. 添加 **合成节点**，将视频 / 音频连线到对应端口
3. 选中合成节点后自动打开 **合成剪辑台**：时间线排列、预览播放、裁切、混流
4. 可导入 SRT 字幕，配置导出参数后输出 MP4 到输出目录

### 斜杠命令

在画布按 `/` 唤起命令面板：

| 命令 | 作用 |
|------|------|
| `/run` | 对当前选区按依赖顺序自动执行 |
| `/agent` | 打开 Agent 面板 |
| `/grid 3x3` | 分镜组切换为 3×3 宫格 |
| `/grid 5x5` | 分镜组切换为 5×5 宫格 |
| `/export storyboard` | 导出分镜组 PNG 拼图 |
| `/style` | 打开图片节点 Drawer 并高亮风格 chip 行（需选中图片节点） |

### 图片编辑器

选中图片节点后，底部 **Generator Drawer** 提供：

- **左侧预览** — 当前生成图；可拖拽调整高度与宽度
- **风格 chip** — 即时预览生效 prompt；部分风格可一键应用推荐模型
- **顶栏「生成」** — Drawer 任意滚动位置可点
- 断开上游文本/脚本连线后，图片节点 **prompt 会自动清除**

设置 → 界面 可切换 **经典布局（v6）** 恢复居中生成器面板。

### 生成历史

1. 侧边栏 **历史** 标签可查看所有生成记录
2. 支持按类型筛选、搜索提示词
3. 点击 **复用** 可在画布中心创建带相同参数的新节点

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 图像/视频生成失败 | 检查 API Key、模型是否已在火山方舟开通 |
| 连线是虚线 | 当前模型不支持该端口组合；换模型或对自定义端点执行「验证能力」 |
| 视频合成不可用 | 设置 → 应用设置 中检测或下载 FFmpeg |
| Agent 计划模型不对 | 在设置中配置默认 LLM/图像/视频模型；检查 Agent 技能是否被禁用 |
| 磁盘空间不足 | 清理输出目录或更换输出路径 |
| 关闭时提示未保存 | 选择「保存并退出」或「不保存」 |

Agent 完整说明见 [Agent 使用指南](docs/v5/agent-guide.md)。

## 快捷键

| 操作 | Windows / Linux | Mac |
|------|-----------------|-----|
| 新建节点 | 双击空白处 | 双击空白处 |
| 斜杠命令 | `/` | `/` |
| 平移画布 | 空格 + 拖拽 | 空格 + 拖拽 |
| 缩放 | 滚轮 | 滚轮 |
| 工作台 · 生成 | `G` | `G` |
| 工作台 · 剪辑 | `E` | `E` |
| 返回画布 | `Esc` | `Esc` |
| 撤销 / 重做 | Ctrl+Z / Ctrl+Shift+Z | Cmd+Z / Cmd+Shift+Z |
| 打组 | Ctrl+G | Cmd+G |
| 删除 | Delete | Delete |
| 保存 | Ctrl+S | Cmd+S |

## 开发

```bash
npm run dev          # Electron 开发
npm run build        # 构建 main / preload / renderer
npm test             # Vitest 单元测试（166+）
npm run test:e2e     # Playwright smoke（5 个 spec）
npm run report:bundle # renderer 包体对比报告 → docs/v9/v9-bundle-size-report.md
npm run package:win  # 构建 + Windows 安装包
```

### 目录概览

```
electron/          # 主进程、preload、utility（FFmpeg / 合成）
src/
  components/      # 画布、节点、面板、壳层（EditorShell / Dock / Drawer）
  layouts/         # CanvasMode、WorkbenchMode
  capabilities/    # 能力目录、连线兼容、槽位标签
  hooks/           # DAG、合成、数据流等
docs/              # 用户指南 + v1–v11 版本索引（详案在 docs/vN/）
e2e/               # Playwright smoke 测试
scripts/           # 包体报告等工具脚本
```

## 技术栈

- **Electron 33** + **React 19** + **TypeScript**
- **React Flow 12**（画布）
- **Zustand**（状态）
- **Tailwind CSS 4**
- **FFmpeg**（裁切 / 合成）
- **better-sqlite3**（项目元数据与生成历史）
- **electron-vite** + **Vitest** + **Playwright**

## 文档

### 用户指南

| 文档 | 说明 |
|------|------|
| [模型配置](docs/v2/model-config.md) | 提供商、能力目录、YAML |
| [工作流模板](docs/v4/workflow-templates.md) | 预置与自定义工作流 |
| [Agent 指南](docs/v5/agent-guide.md) | Agent、DAG、斜杠命令 |
| [账号说明](docs/v5/account-guide.md) | 游客 / 本地账号、数据目录 |
| [测试用例](docs/v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) | v5 手工验收清单（附录 A） |

### 版本索引（v1–v11）

根目录为**精简索引**，完整详案在 `docs/vN/`。目录约定见 [docs/README.md](docs/README.md)。

| 版本 | 索引 | 详案目录 |
|------|------|----------|
| v1 | [画布基础](docs/LocalCanvas_v1_画布基础与节点系统.md) | [v1/](docs/v1/) |
| v2 | [模型与生成器](docs/LocalCanvas_v2_模型配置与生成器系统.md) | [v2/](docs/v2/) |
| v3 | [视频合成](docs/LocalCanvas_v3_视频合成与项目打磨.md) | [v3/](docs/v3/) |
| v4 | [发布完善](docs/LocalCanvas_v4_完善高级功能与发布.md) | [v4/](docs/v4/) |
| v5 | [Agent / DAG](docs/LocalCanvas_v5_Agent自动化与分镜增强.md) | [v5/](docs/v5/) |
| v6 | [能力系统](docs/LocalCanvas_v6_节点体验与能力系统.md) | [v6/](docs/v6/) · [design/](docs/v6/design/) |
| v7 | — | [v7/README](docs/v7/README.md)（未单独发版） |
| v8 | [界面重设计](docs/LocalCanvas_v8_界面与体验重设计.md) | [v8/](docs/v8/) · [design/](docs/v8/design/) |
| v9 | [精简收官](docs/LocalCanvas_v9_精简优化与体验收官.md) | [v9/](docs/v9/) |
| v10 | [冗余清除与技术债归零](docs/LocalCanvas_v10_项目优化与技术债归集.md) | [v10/](docs/v10/) |
| v11 | [Agent 与设置增强](docs/LocalCanvas_v11_Agent与设置增强.md) | [v11/](docs/v11/) |

| 其他 | 说明 |
|------|------|
| [文档目录说明](docs/README.md) | 索引 / 详案 / 命名约定 |
| [开发步骤表](docs/LocalCanvas_开发步骤表.md) | 跨版本 Phase 拆解 |
| [包体报告](docs/v9/v9-bundle-size-report.md) | renderer 懒加载体积对比 |

## License

MIT

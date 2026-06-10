# 模型配置指南

> LocalCanvas 通过 **HTTP API 适配器** 对接模型服务，不依赖本地推理引擎（如 ComfyUI、Stable Diffusion WebUI 等）。「工作流」在本文档中指画布节点编排模板，与外部推理工作流无关。

## 配置方式

### 应用内（推荐）

打开 **设置 → 模型与能力**，分两个标签页：

| 标签 | 内容 |
|------|------|
| **已接入模型** | 从预设目录添加、填写 Key、测试连接、验证能力、设为默认 |
| **应用设置** | 全局默认模型、输出目录、FFmpeg、并发数、Agent 技能、语言 |

「已接入模型」页还提供：

- **能力徽章** — 展示模型支持的输入/输出模态（文本、图像、视频、思考等）
- **同步能力目录** — L2 同步：拉取账户已开通模型，一键添加有预设的条目
- **验证能力** — L3 探测：对自定义端点或需探测的模型发送最小请求，缓存实测能力

### 配置文件

路径：

- Windows：`%APPDATA%/LocalCanvas/config.yaml`
- macOS：`~/Library/Application Support/LocalCanvas/config.yaml`

修改后 Utility Process 会自动热重载。

## 能力系统概览

每个已接入模型会关联一份 **能力目录（Capability Profile）**，驱动以下行为：

1. **节点端口** — 视频节点是否显示 `lastFrame`、`reference1`…`reference9` 等
2. **连线样式** — 兼容为实线，不兼容为虚线警告
3. **生成拦截** — 对生成所依赖的关键入边，虚线连线会在点击生成时阻断并提示原因
4. **Agent 选模** — Agent 规划工作流时读取能力目录选择合适模型
5. **UI 控件** — LLM 思考档位、视频参考图槽位数量等

能力来源分三层：

| 层级 | 说明 |
|------|------|
| **L1 内置目录** | 随应用发布的 `profile_key` 预设（DeepSeek、GPT-4o、Seedance 2.0 等） |
| **L2 账户同步** | 从提供商 API 拉取已开通模型列表，匹配内置预设后提示添加 |
| **L3 实测探测** | 对 `custom` 提供商或标记需探测的模型，发送探测请求并缓存结果 |

### profile_key 字段

为模型指定内置能力目录（推荐对已知预设使用）：

```yaml
llm_models:
  - id: deepseek-v4-flash
    name: DeepSeek V4 Flash
    provider: openai_compatible
    endpoint: https://api.deepseek.com/v1/chat/completions
    api_key: YOUR_KEY
    model: deepseek-v4-flash
    profile_key: deepseek-v4-flash

video_models:
  - id: seedance-2-0
    name: Seedance 2.0
    provider: volcengine_seedance
    endpoint: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
    poll_endpoint: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
    api_key: YOUR_ARK_KEY
    model: doubao-seedance-2-0-260128
    profile_key: seedance-2-0
```

未指定 `profile_key` 时，系统会按 `model` 字段模式匹配或回退到通用推断。

### 内置能力摘要

| 模型族 | 主要能力 |
|--------|----------|
| DeepSeek V4 Flash / Pro | 文本生成；Flash 支持思考档位（关/均衡/深度） |
| GPT-4o / Gemini / Kimi 等 | 文本 + 多图 Vision（最多 10–20 张，因模型而异） |
| Seedream 5.0 Lite | 文生图；最多 14 张参考图；2K/3K |
| Seedream 4.5 / 4.0 | 文生图；4.5 支持最多 4 张参考图 |
| Seedance 1.0 Pro Fast | 文生视频、首帧图生视频 |
| Seedance 2.0 / 2.0 Fast | 首帧、尾帧、最多 9 张参考图、参考音视频 |

完整定义见源码 `src/capabilities/builtin/profiles.ts`。

### 思考档位（Reasoning）

支持思考的 LLM 在文本节点可切换档位，请求时会附带对应 `extra_body` / `reasoning_effort` 参数。深度档建议提高 `max_tokens` 避免推理内容被截断。

### 虚线边与生成拦截

- **虚线** = 当前模型能力目录认定该连线不兼容（如画布探索性连线）
- **实线** = 兼容；部分场景仍需满足数量上限（如参考图 ≤ 9）
- 生成拦截仅针对 **关键入边**（如视频 `firstFrame`、文本 `prompt`）；非关键虚线边不阻断「仅用草稿」的生成

自定义模型完成 **验证能力** 后，虚线可能升级为实线。

## 支持的提供商

| provider | 用途 | 说明 |
|----------|------|------|
| `openai_compatible` | 图像/文本/视频 | OpenAI 兼容 HTTP API（火山方舟、DeepSeek、通义等） |
| `volcengine_seedance` | 视频 | Doubao Seedance 专用适配器（异步轮询） |
| `replicate` | 图像/视频/文本 | Replicate 云端模型，需 API Token |
| `custom` | 全部 | 自定义 HTTP 端点，通过模板配置；支持能力推断与 L3 探测 |

## OpenAI 兼容 API（火山方舟示例）

```yaml
image_models:
  - id: seedream-5-0-lite
    name: Doubao Seedream 5.0 Lite
    provider: openai_compatible
    endpoint: https://ark.cn-beijing.volces.com/api/v3/images/generations
    api_key: YOUR_ARK_API_KEY
    model: doubao-seedream-5.0-lite
  - id: seedream-4.5
    name: Seedream 4.5
    provider: openai_compatible
    endpoint: https://ark.cn-beijing.volces.com/api/v3/images/generations
    api_key: YOUR_ARK_API_KEY
    model: doubao-seedream-4-5-251128

video_models:
  - id: seedance-2.0
    name: Seedance 2.0
    provider: volcengine_seedance
    endpoint: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
    poll_endpoint: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
    api_key: YOUR_ARK_API_KEY
    model: doubao-seedance-2-0-260128
    profile_key: seedance-2-0
```

## Replicate

```yaml
image_models:
  - id: replicate-flux
    name: FLUX (Replicate)
    provider: replicate
    api_key: r8_xxxxxxxx
    model: black-forest-labs/flux-dev
    endpoint: ""
```

`model` 字段填写 Replicate 模型版本标识（如 `owner/model` 或 version hash）。

## 自定义 HTTP 端点

适用于任意 REST API，通过请求模板和响应映射适配：

```yaml
llm_models:
  - id: my-vision-llm
    name: 自定义 Vision LLM
    provider: custom
    endpoint: https://api.example.com/v1/chat/completions
    model: my-model
    api_key: YOUR_TOKEN
    custom_config:
      endpoint: https://api.example.com/v1/chat/completions
      method: POST
      headers:
        Authorization: "Bearer {{api_key}}"
      request_template:
        model: "{{model}}"
        messages:
          - role: user
            content:
              - type: text
                text: "{{prompt}}"
              - type: image_url
                image_url:
                  url: "{{image_url}}"
      response_mapping:
        text: "$.choices[0].message.content"
```

添加后请在设置页点击 **验证能力**，系统会根据模板推断是否支持 Vision、异步轮询等，并写入探测缓存。

### 模板变量

| 变量 | 适用场景 |
|------|----------|
| `{{prompt}}` | 图像/视频/文本 |
| `{{negative_prompt}}` | 图像 |
| `{{width}}` / `{{height}}` | 图像/视频 |
| `{{duration}}` | 视频 |
| `{{first_frame}}` / `{{last_frame}}` | 视频 |
| `{{image_url}}` | LLM Vision（多图时按序传入） |
| `{{max_tokens}}` / `{{temperature}}` | 文本 |
| `{{api_key}}` / `{{model}}` | 通用 |

### 响应映射（JSONPath 风格）

- `output_url`：生成结果文件 URL
- `status`：异步任务状态字段
- `text`：文本生成结果

### 自定义能力推断规则（摘要）

系统会扫描 `request_template` 与 `response_mapping`：

- 含 `chat/completion`、`messages` → 推断为 LLM
- 含 `image_url`、`vision` → 推断支持图像输入
- 含 `first_frame`、`last_frame` → 推断视频首尾帧能力
- 含 `poll_config` → 推断异步任务

推断结果置信度为 `inferred`，建议执行 L3 验证后用于连线判断。

## 全局设置

```yaml
settings:
  default_image_model: seedream-4.5
  default_video_model: seedance-2-0
  default_llm: deepseek-v4-flash
  default_tts: ""
  output_dir: ~/LocalCanvas/outputs
  max_concurrent_tasks: 3
  auto_save_interval: 30
  ffmpeg_path: ""
  onboarding_completed: true
```

| 字段 | 说明 |
|------|------|
| `default_*_model` | 各类型默认模型；Agent 与新建节点会参考这些值 |
| `max_concurrent_tasks` | 并发生成上限（1–10） |
| `auto_save_interval` | 项目自动保存间隔（秒） |
| `ffmpeg_path` | 留空则自动检测系统 PATH；也可在设置页一键下载 |
| `onboarding_completed` | 设为 `true` 跳过首次引导 |

## 安全说明

- API Key 仅保存在本机 `config.yaml`，不会上传至第三方（除你配置的模型 API 端点）
- 建议在火山方舟等控制台为 Key 设置合理权限与用量告警

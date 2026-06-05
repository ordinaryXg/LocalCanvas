# 模型配置指南

> LocalCanvas 通过 **HTTP API 适配器** 对接模型服务，不依赖本地推理引擎（如 ComfyUI、Stable Diffusion WebUI 等）。「工作流」在本文档中指画布节点编排模板，与外部推理工作流无关。

配置文件路径：`%APPDATA%/LocalCanvas/config.yaml`（Windows）或 `~/Library/Application Support/LocalCanvas/config.yaml`（macOS）。

也可在应用内 **设置** 面板可视化编辑。

## 支持的提供商

| provider | 用途 | 说明 |
|----------|------|------|
| `openai_compatible` | 图像/文本/视频 | OpenAI 兼容 HTTP API（火山方舟等） |
| `volcengine_seedance` | 视频 | Doubao Seedance 2.0 专用适配器 |
| `replicate` | 图像/视频/文本 | Replicate 云端模型，需 API Token |
| `custom` | 全部 | 自定义 HTTP 端点，通过模板配置 |

## OpenAI 兼容 API（火山方舟示例）

```yaml
image_models:
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
```

## Replicate

```yaml
image_models:
  - id: replicate-flux
    name: FLUX (Replicate)
    provider: replicate
    api_key: r8_xxxxxxxx
    model: black-forest-labs/flux-dev
    endpoint: ""  # Replicate 使用固定 API，endpoint 可留空
```

`model` 字段填写 Replicate 模型版本标识（如 `owner/model` 或 version hash）。

## 自定义 HTTP 端点

适用于任意 REST API，通过请求模板和响应映射适配：

```yaml
image_models:
  - id: my-custom-api
    name: 自定义图像 API
    provider: custom
    endpoint: https://api.example.com/generate
    model: custom
    custom_config:
      endpoint: https://api.example.com/generate
      method: POST
      headers:
        Authorization: "Bearer YOUR_TOKEN"
      request_template:
        prompt: "{{prompt}}"
        width: "{{width}}"
        height: "{{height}}"
      response_mapping:
        output_url: "$.data.url"
        status: "$.data.status"
        text: "$.data.text"
      poll_config:
        enabled: true
        endpoint: "https://api.example.com/tasks/{id}"
        interval_ms: 2000
        completion_status: succeeded
```

### 模板变量

| 变量 | 适用场景 |
|------|----------|
| `{{prompt}}` | 图像/视频/文本 |
| `{{negative_prompt}}` | 图像 |
| `{{width}}` / `{{height}}` | 图像/视频 |
| `{{duration}}` | 视频 |
| `{{first_frame}}` / `{{last_frame}}` | 视频 |
| `{{max_tokens}}` / `{{temperature}}` | 文本 |

### 响应映射（JSONPath 风格）

- `output_url`：生成结果文件 URL
- `status`：异步任务状态字段
- `text`：文本生成结果

## 全局设置

```yaml
settings:
  default_image_model: seedream-4.5
  default_video_model: seedance-2.0
  default_llm: ""
  default_tts: ""
  output_dir: ~/LocalCanvas/outputs
  max_concurrent_tasks: 3
  auto_save_interval: 30
  ffmpeg_path: ""
```

修改配置后保存，Utility Process 会自动热重载。

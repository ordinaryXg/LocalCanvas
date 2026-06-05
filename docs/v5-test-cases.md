# LocalCanvas v5 测试用例

> **版本**：v5（Agent + DAG + 分镜组 + 后期工具 + 本地用户系统）  
> **关联文档**：[LocalCanvas_v5_Agent自动化与分镜增强.md](./LocalCanvas_v5_Agent自动化与分镜增强.md)、[agent-guide.md](./agent-guide.md)  
> **更新日期**：2026-06-05

---

## 1. 测试范围

### 1.1 纳入范围

| 模块 | 说明 |
|------|------|
| 本地用户系统 | 注册、登录、登出、游客、资料、数据隔离、v4 遗留迁移 |
| Agent 模式 | 对话、计划生成、Skill、落画布、会话存档 |
| DAG 执行 | 拓扑排序、整组执行、进度面板、崩溃恢复 |
| Slash 指令 | `/run`、`/agent`、`/grid`、`/export storyboard`、`/style` |
| 分镜组 | 脚本转换、宫格、批量重生、导出 |
| 音频后期 | 人声分离（Demucs / FFmpeg） |
| 字幕 | SRT 导入、预览、硬字幕烧录 |
| 风格模板 | 图像/视频生成器套用预设 |
| 数据层 | SQLite 新表、`user_id` 隔离、migration |
| 发布项 | CHANGELOG、文档、设置页新增项 |

### 1.2 不纳入范围（v6）

导演台 3D、云端服务端、字幕 AI 擦除、社区分享、OpenClaw、本地模型直连。

### 1.3 测试环境

| 项 | 要求 |
|----|------|
| 操作系统 | Windows 10/11（主）、macOS（可选抽检） |
| 构建 | `npm run build` 通过后启动；E2E 使用 `npm run test:e2e:full` |
| 前置配置 | 至少 1 个 LLM、1 个图像模型、FFmpeg 可用 |
| 可选 | Demucs CLI 已安装（人声分离高质量路径） |
| 数据 | 准备：空白安装、含 v4 遗留项目、双测试账号 |

### 1.4 用例编号规则

```
TC-{类型}-{模块}-{序号}

类型：M=手工  A=自动化单测  I=集成  E=E2E
模块：AUTH AGENT DAG SLASH SB AUDIO SUB STYLE CFG REL
```

### 1.5 优先级

| 级别 | 含义 |
|------|------|
| P0 | 阻塞发布，必须通过 |
| P1 | 重要体验，建议发布前通过 |
| P2 | 增强项，可延后 |

---

## 2. 用户系统（AUTH）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-AUTH-001 | P0 | 新用户注册 | 首次启动，未登录 | 1. 打开应用<br>2. 切换注册<br>3. 输入用户名（≥3 字符）、密码（≥8 位）、确认密码<br>4. 提交 | 注册成功，进入主界面；`users` 表有新记录，密码为 bcrypt 哈希 | ⬜ |
| TC-M-AUTH-002 | P0 | 用户名重复 | 已存在用户 `alice` | 1. 注册同名用户 `alice` | 提示用户名已占用，不创建重复记录 | ⬜ |
| TC-M-AUTH-003 | P0 | 登录与登出 | 已有账号 `alice` | 1. 登录<br>2. 创建项目 A<br>3. 顶栏登出<br>4. 再以 `bob` 登录 | 登出后会话清除；`bob` 看不到 `alice` 的项目 A | ⬜ |
| TC-M-AUTH-004 | P0 | 游客模式 | 启动页 | 1. 点击「稍后再说 / 游客模式」 | 进入主界面，`isGuest=true`；可创建项目 | ⬜ |
| TC-M-AUTH-005 | P0 | 双用户数据隔离 | 用户 A、B 各一账号 | 1. A 创建项目并生成历史记录<br>2. 登出，B 登录<br>3. 查看项目列表、历史面板、工作流列表 | B 仅看到自己的数据；A 的项目/历史/自定义工作流不可见 | ⬜ |
| TC-M-AUTH-006 | P1 | v4 遗留数据迁移 | 存在 `user_id` 为空的 v4 项目 | 1. 首次注册或登录<br>2. 查看项目列表 | 遗留项目绑定到当前用户；`claimedLegacyProjects` > 0（注册响应） | ⬜ |
| TC-M-AUTH-007 | P1 | 修改昵称 | 已登录 | 1. 打开账号设置（`UserProfilePanel`）<br>2. 修改 displayName 保存 | 顶栏显示新昵称；`users.display_name` 更新 | ⬜ 待 UI |
| TC-M-AUTH-008 | P1 | 修改头像 | 已登录 | 1. 账号设置中选择本地头像文件<br>2. 保存 | 顶栏显示头像；`users.avatar_path` 有值 | ⬜ 待 UI |
| TC-M-AUTH-009 | P1 | 会话保持 | 已登录 | 1. 登录后关闭应用<br>2. 重新打开 | 自动恢复登录态（`session.json` + `user_sessions`） | ⬜ |
| TC-M-AUTH-010 | P2 | v6 预留字段 | 已登录用户 | 1. 查 SQLite `users` 表 | `sync_status='local'`，`cloud_user_id` 为 NULL | ⬜ |

### 自动化

| ID | 优先级 | 标题 | 命令/文件 | 预期 | 状态 |
|----|--------|------|-----------|------|------|
| TC-A-AUTH-001 | P0 | 密码 bcrypt 哈希 | `electron/main/services/auth-service.test.ts`（待建） | 注册后 `password_hash` 以 `$2` 开头，明文不入库 | ⬜ |
| TC-A-AUTH-002 | P0 | 登录校验失败 | 同上 | 错误密码返回 `AUTH_INVALID_CREDENTIALS`，不创建会话 | ⬜ |
| TC-A-AUTH-003 | P0 | claimLegacyData | 同上 | 无 `user_id` 行数正确迁移到当前用户 | ⬜ |

---

## 3. Agent 模式（AGENT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-AGENT-001 | P0 | 打开 Agent 面板 | 已配置 LLM | 1. 侧栏点 Agent 或 `/agent` | Agent 面板打开，可输入消息 | ⬜ |
| TC-M-AGENT-002 | P0 | 意图 → 计划预览 | LLM 可用 | 1. 输入「做一个 15 秒咖啡品牌短片」<br>2. 发送 | 返回文字回复 + `WorkflowPlan` 预览（节点列表） | ⬜ |
| TC-M-AGENT-003 | P0 | 计划落画布 | 有计划预览 | 1. 点击「确认并添加到画布」 | 画布出现对应节点与连线；节点不严重重叠 | ⬜ |
| TC-M-AGENT-004 | P0 | 自动模式触发 DAG | 计划 `executionMode: 'auto'` | 1. 确认计划 | 落画布后自动开始 DAG；底部进度面板出现 | ⬜ |
| TC-M-AGENT-005 | P1 | Skill：文生视频 | 禁用其他 Skill | 1. 输入纯文生视频意图 | 路由到 `text-to-video` Skill，计划含 text→image→video 链路 | ⬜ |
| TC-M-AGENT-006 | P1 | Skill：脚本成片 | — | 1. 输入「根据故事写脚本并出分镜」 | 路由 `script-to-film`，计划含 script/storyboard | ⬜ |
| TC-M-AGENT-007 | P1 | Skill：首尾帧 | — | 1. 输入首尾帧过渡视频意图 | 路由 `first-last-frame` | ⬜ |
| TC-M-AGENT-008 | P1 | 禁用 Skill | 设置页关闭 `script-to-film` | 1. 发送脚本成片类意图 | 不走该 Skill 或降级为通用计划 | ⬜ |
| TC-M-AGENT-009 | P1 | 计划 JSON 非法 | Mock LLM 返回非 JSON | 1. 发送消息 | 不崩溃；提示解析失败或纯文本回复 | ⬜ |
| TC-M-AGENT-010 | P1 | 会话持久化 | 同项目多次对话 | 1. 对话 2 轮<br>2. 查 `agent_sessions` 表 | `messages` JSON 含 user/assistant；`last_plan` 有值 | ⬜ |
| TC-M-AGENT-011 | P2 | 会话历史 UI | 有多条会话 | 1. Agent 面板查看历史列表 | 可按项目切换历史会话 | ⬜ 待 UI |

### 自动化

| ID | 优先级 | 标题 | 文件 | 预期 | 状态 |
|----|--------|------|------|------|------|
| TC-A-AGENT-001 | P0 | 解析最小合法计划 | `parseWorkflowPlan.test.ts` | `nodes/edges/executionMode` 正确 | ✅ |
| TC-A-AGENT-002 | P0 | 从 Markdown 代码块提取 JSON | 同上 | 正确解析 fence 内 JSON | ✅ |
| TC-A-AGENT-003 | P0 | 非法节点类型抛错 | 同上 | `WorkflowPlanParseError` | ✅ |
| TC-A-AGENT-004 | P0 | 缺省字段补全 | 同上（待补充） | 缺 `executionMode` 时默认 `manual` | ⬜ |
| TC-A-AGENT-005 | P0 | 空节点列表 | 同上（待补充） | 拒绝或返回空计划错误 | ⬜ |
| TC-A-AGENT-006~010 | P0 | 边界用例集 | 同上（待补充至 ≥10 例） | 环边、重复 tempId、缺 data 等 | ⬜ |
| TC-I-AGENT-001 | P1 | Mock LLM 落画布 | 集成（待建） | plan → `applyWorkflowPlan` 节点数/边数一致 | ⬜ |

---

## 4. DAG 执行（DAG）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-DAG-001 | P0 | 三节点拓扑序执行 | 文本→图片→视频已连线配置模型 | 1. 框选三节点<br>2. 右键「整组执行」或 `/run` | 按依赖顺序执行；上游输出流入下游 | ⬜ |
| TC-M-DAG-002 | P0 | 进度面板更新 | 执行中 | 1. 观察 `DagRunPanel` | 节点状态 pending→running→completed；计数递增 | ⬜ |
| TC-M-DAG-003 | P0 | 环路阻断 | 故意连成环 | 1. 整组执行 | 提示存在环路，不开始执行 | ⬜ |
| TC-M-DAG-004 | P0 | 单节点失败停止 | 图片节点无 prompt | 1. 整组执行 | 失败节点标记 failed；后续不执行；DAG 状态 failed | ⬜ |
| TC-M-DAG-005 | P1 | 失败节点重试 | 某节点失败 | 1. 在进度面板点「重试」 | 仅从该节点重新执行 | ⬜ 待 UI |
| TC-M-DAG-006 | P1 | 失败节点跳过 | 某节点失败 | 1. 点「跳过」<br>2. 继续 | 节点标记 skipped；后续节点继续 | ⬜ 待 UI |
| TC-M-DAG-007 | P1 | 执行到此节点 | 5 节点链 | 1. 右键目标节点「执行到此节点」 | 仅执行其上游拓扑链 | ⬜ 待 UI |
| TC-M-DAG-008 | P1 | 崩溃恢复提示 | DAG 执行中断 | 1. 执行中强杀进程<br>2. 重启应用 | `dag_runs.status` 变为 paused；弹窗询问是否继续 | ⬜ 待 UI |
| TC-M-DAG-009 | P1 | 同层并发 | 10 个无依赖图片节点 | 1. 整组执行<br>2. 观察并发 | 同时运行数 ≤ `max_concurrent_tasks` | ⬜ 待实现 |
| TC-M-DAG-010 | P2 | dag_runs 记录 | 完成一次执行 | 1. 查 SQLite | `dag_runs` + `dag_run_nodes` 有完整记录 | ⬜ |

### 自动化

| ID | 优先级 | 标题 | 文件 | 预期 | 状态 |
|----|--------|------|------|------|------|
| TC-A-DAG-001 | P0 | 线性拓扑排序 | `topologicalSort.test.ts` | 顺序正确 | ✅ |
| TC-A-DAG-002 | P0 | 环检测 | 同上 | 抛出 `DagCycleError` | ✅ |
| TC-A-DAG-003 | P0 | 分支合并图 | 同上（待补充） | 多前驱节点排序正确 | ⬜ |
| TC-E-DAG-001 | P1 | 整组执行冒烟 | `e2e/dag-smoke.spec.ts`（待建） | Mock 生成完成，进度面板出现 | ⬜ |

---

## 5. Slash 指令（SLASH）

| ID | 优先级 | 标题 | 步骤 | 预期结果 | 状态 |
|----|--------|------|------|----------|------|
| TC-M-SLASH-001 | P0 | 打开命令面板 | 画布按 `/` | 浮层出现，可输入过滤 | ⬜ |
| TC-M-SLASH-002 | P0 | 模糊搜索 | 输入 `run` | 匹配 `/run` 整组执行 | ⬜ |
| TC-M-SLASH-003 | P0 | `/run` | 选中节点后执行 `/run` | 等同整组执行 | ⬜ |
| TC-M-SLASH-004 | P1 | `/grid 3x3` | 选中分镜组 | layout 变为 `grid3` | ⬜ |
| TC-M-SLASH-005 | P2 | `/grid 5x5` | 选中分镜组 | layout 变为 `grid5` | ⬜ |
| TC-M-SLASH-006 | P1 | `/export storyboard` | 选中有帧的分镜组 | 导出 PNG 并打开输出目录 | ⬜ |
| TC-M-SLASH-007 | P2 | `/style` | 执行命令 | 打开风格选择或聚焦生成器风格下拉 | ⬜ 待完善 |

### 自动化

| ID | 优先级 | 标题 | 文件 | 预期 | 状态 |
|----|--------|------|------|------|------|
| TC-A-SLASH-001 | P1 | 命令列表完整 | `slashCommands.test.ts` | 含 run/agent/export/style | ✅ |
| TC-A-SLASH-002 | P1 | 过滤逻辑 | 同上 | 关键词/描述匹配 | ✅ |

---

## 6. 分镜组（SB）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-SB-001 | P0 | 脚本转分镜组 | 脚本节点有 rows | 1. 右键脚本节点<br>2. 「转为分镜组」 | 新建 storyboard 节点，`frames` 数量与脚本行一致 | ⬜ |
| TC-M-SB-002 | P0 | 宫格切换 | 分镜组有 ≥9 帧 | 1. 切换 list / grid3 / grid5 | 节点内布局相应变化 | ⬜ |
| TC-M-SB-003 | P0 | 勾选批量重生图片 | 已配置图像模型 | 1. 勾选 3 帧<br>2. 「重生成选中帧（图）」 | 选中帧 `imageSrc` 更新；进度正常 | ⬜ |
| TC-M-SB-004 | P1 | 批量重生视频 | 已配置视频模型 | 1. 勾选帧<br>2. 重生视频 | 帧 `videoSrc` 更新 | ⬜ 待实现 |
| TC-M-SB-005 | P1 | 导出 PNG 拼图 | 有帧（含无图占位） | 1. 导出 PNG | `outputs/storyboard.png` 生成，含序号与描述 | ⬜ |
| TC-M-SB-006 | P1 | 导出 PDF | 同上 | 1. 导出 PDF | `outputs/storyboard.pdf` 可打开 | ⬜ |
| TC-M-SB-007 | P2 | 导出 4K 单帧 | 选中 1 帧且有图 | 1. 导出 4K | `frame-{n}-4k.png` 宽度 3840 | ⬜ |
| TC-M-SB-008 | P1 | 同步到画布 | 分镜组有多帧 | 1. 「同步到画布」 | 每帧关联 image/video 子节点 | ⬜ 待实现 |

### 自动化

| ID | 优先级 | 标题 | 文件 | 预期 | 状态 |
|----|--------|------|------|------|------|
| TC-A-SB-001 | P1 | 脚本行转帧 | `storyboardConvert`（待建） | sequence/description/prompt 映射正确 | ⬜ |
| TC-E-SB-001 | P0 | 分镜导出冒烟 | `e2e/storyboard-export.spec.ts`（待建） | IPC 返回 outputPath，文件存在 | ⬜ |

---

## 7. 音频后期（AUDIO）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-AUDIO-001 | P1 | Demucs 分离 | 配置 demucs_path 或 PATH 有 demucs；音频节点有文件 | 1. 「分离人声」 | 生成 vocals + instrumental；创建两个子音频节点 | ⬜ |
| TC-M-AUDIO-002 | P1 | FFmpeg 回退 | 无 Demucs | 1. 分离人声 | 使用 FFmpeg 简易分离；提示为 fallback 模式 | ⬜ |
| TC-M-AUDIO-003 | P2 | HTTP API 分离 | 配置 vocal_separation_endpoint | 1. 分离人声 | 调用 API 并落盘 | ⬜ 待实现 |
| TC-M-AUDIO-004 | P1 | 无音频时禁用 | 空音频节点 | 1. 查看按钮 | 「分离人声」不可用 | ⬜ |

---

## 8. 字幕（SUB）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | 状态 |
|----|--------|------|----------|------|----------|------|
| TC-M-SUB-001 | P1 | 导入 SRT | 合成节点有视频轨 | 1. 「导入 SRT」选文件 | `subtitleCues` 解析成功；显示条数 | ⬜ |
| TC-M-SUB-002 | P1 | 时间轴预览 | 已导入 SRT | 1. 拖动播放指针 | 预览区与字幕轨高亮当前 cue | ⬜ |
| TC-M-SUB-003 | P2 | 硬字幕烧录 | 已导入 + 有视频片段 | 1. 勾选「烧录硬字幕」<br>2. 导出合成 | 输出 MP4 含烧录字幕 | ⬜ |
| TC-M-SUB-004 | P1 | 非法 SRT | 损坏/空文件 | 1. 导入 | 提示解析失败，不写入节点 | ⬜ |

### 自动化

| ID | 优先级 | 标题 | 文件 | 预期 | 状态 |
|----|--------|------|------|------|------|
| TC-A-SUB-001 | P1 | 标准 SRT 解析 | `parseSrt.test.ts` | 时间戳、文本、多行 | ✅ |
| TC-A-SUB-002 | P1 | 播放时间查找 | 同上 | `findCueAtTime` 边界正确 | ✅ |
| TC-A-SUB-003 | P1 | 无序号 SRT | 同上（待补充） | 仍能解析 | ⬜ |

---

## 9. 风格模板（STYLE）

| ID | 优先级 | 标题 | 步骤 | 预期结果 | 状态 |
|----|--------|------|------|----------|------|
| TC-M-STYLE-001 | P2 | 图像套用电影感 | 1. 图像生成器选「电影感」<br>2. 生成 | 请求 prompt 含 cinematic 前缀；负向词合并 | ⬜ |
| TC-M-STYLE-002 | P2 | 视频套用动漫 | 1. 视频生成器选「动漫」<br>2. 生成 | prompt 含 anime 前缀 | ⬜ |
| TC-M-STYLE-003 | P2 | 切换语言 | 1. 设置 en-US<br>2. 查看风格下拉 | 显示英文名（Cinematic 等） | ⬜ |

---

## 10. 设置与配置（CFG）

| ID | 优先级 | 标题 | 步骤 | 预期结果 | 状态 |
|----|--------|------|------|----------|------|
| TC-M-CFG-001 | P0 | FFmpeg 检测/下载 | 设置页操作 | 路径写入 config；合成可用 | ⬜ |
| TC-M-CFG-002 | P1 | Demucs 路径 | 填写 demucs_path 保存 | 重启后保留；人声分离优先 Demucs | ⬜ |
| TC-M-CFG-003 | P1 | Agent Skill 开关 | 禁用某 Skill | localStorage + 设置页一致；Agent 生效 | ⬜ |
| TC-M-CFG-004 | P2 | Agent 默认模型 | 设置默认 LLM | Agent 对话使用该模型 | ⬜ 待 UI |
| TC-M-CFG-005 | P2 | 人声分离 API | 填写 endpoint/key | 分离走 API | ⬜ 待 UI |

---

## 11. 发布与升级（REL）

| ID | 优先级 | 标题 | 步骤 | 预期结果 | 状态 |
|----|--------|------|------|----------|------|
| TC-M-REL-001 | P0 | v4→v5 数据库迁移 | 用 v4 用户数据目录启动 v5 | 自动建表；`user_id` 列存在；旧项目可打开 | ⬜ |
| TC-M-REL-002 | P0 | 画布数据兼容 | 打开 v4 保存的项目 | 节点/连线/资源路径正常 | ⬜ |
| TC-M-REL-003 | P0 | IPC 类型完整 | 抽查 `storyboard`/`audio`/`dag`/`agent` | preload 与 `src/types/ipc.ts` 一致 | ⬜ |
| TC-M-REL-004 | P1 | 文档齐全 | 检查 docs | `agent-guide.md` 存在；`account-guide.md` 待补 | 🔶 |
| TC-M-REL-005 | P1 | CHANGELOG v5 | 打开 CHANGELOG | 记录 v5 新特性 | ⬜ |
| TC-M-REL-006 | P1 | 中英文切换 | 切换 zh-CN / en-US | Agent/DAG/分镜无遗漏硬编码（抽检） | ⬜ |

---

## 12. E2E 场景（端到端）

| ID | 优先级 | 场景 | 步骤摘要 | 预期 | 状态 |
|----|--------|------|----------|------|------|
| TC-E-FLOW-001 | P0 | 注册到导出分镜 | 注册 → 新建项目 → 脚本生成 → 转分镜组 → 导出 PNG | 全链路无崩溃，输出文件存在 | ⬜ |
| TC-E-FLOW-002 | P0 | Agent 到 DAG | Agent 描述意图 → 确认计划 → 自动执行 | 节点生成物写入项目 assets | ⬜ |
| TC-E-FLOW-003 | P1 | 合成+字幕 | 视频片段 → 合成节点 → 导入 SRT → 烧录导出 | 输出带硬字幕 MP4 | ⬜ |
| TC-E-FLOW-004 | P1 | 音频分离 | TTS 生成 → 分离人声 → 子节点可播放 | 两个 wav/mp3 可导入项目 | ⬜ |
| TC-E-FLOW-005 | P0 | 双账号隔离 | A/B 交替登录同一机器 | 项目列表互不可见 | ⬜ |

**建议 Playwright 文件规划**

```
e2e/
  app.spec.ts              # 已有：启动冒烟
  compose-smoke.spec.ts    # 已有：合成映射
  auth-isolation.spec.ts   # 待建：TC-E-FLOW-005
  storyboard-export.spec.ts# 待建：TC-E-FLOW-001
  agent-dag.spec.ts        # 待建：TC-E-FLOW-002（需 mock LLM）
```

---

## 13. 测试执行记录模板

```markdown
### 执行批次：v5-rc1 — 2026-__-__

| 模块 | 用例数 | 通过 | 失败 | 阻塞 | 跳过 | 通过率 |
|------|--------|------|------|------|------|--------|
| AUTH | | | | | | |
| AGENT | | | | | | |
| DAG | | | | | | |
| ... | | | | | | |

**失败用例**：
- TC-M-xxx：现象 / 复现步骤 / 关联 issue

**阻塞项**：
- ...

**签字**：测试 __ / 开发 __ / 产品 __
```

---

## 14. 当前自动化覆盖快照

| 套件 | 命令 | 用例数（约） | 说明 |
|------|------|-------------|------|
| Vitest 单测 | `npm test` | 54 | 含 topologicalSort、parseWorkflowPlan(3)、slashCommands、parseSrt |
| Playwright E2E | `npm run test:e2e:full` | 2 文件 | 启动 + 合成 smoke |
| 待补充单测 | — | — | auth-service、parseWorkflowPlan +7、storyboardConvert |
| 待补充 E2E | — | — | 见 §12 |

---

## 15. 附录：与未完成功能的映射

以下用例标记为 **待 UI / 待实现**，对应当前 V5 缺口，可在功能补齐后取消跳过：

| 用例 ID | 依赖功能 |
|---------|----------|
| TC-M-AUTH-007/008 | `UserProfilePanel` |
| TC-M-DAG-005~007 | DAG 重试/跳过/执行到此节点 |
| TC-M-DAG-008 | 崩溃恢复确认弹窗 |
| TC-M-DAG-009 | DAG 同层并发 |
| TC-M-SB-004/008 | 分镜批量视频、同步到画布 |
| TC-M-AUDIO-003 | 人声分离 HTTP API |
| TC-M-SLASH-007 | `/style` 独立选择器 |
| TC-M-CFG-004/005 | Agent 默认模型、分离 API 设置 |
| TC-M-AGENT-011 | Agent 会话历史 UI |

---

*本文档随 V5 迭代更新；用例状态列请在每次测试执行后维护（⬜ 未测 / ✅ 通过 / ❌ 失败 / ⏭ 跳过）。*

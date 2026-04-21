# Codex Bridge

Anthropic 风格请求到 OpenAI Responses 格式的转换代理，供 Codex 使用。

## 功能

将 Codex 的 OpenAI Responses API 请求格式转换为 Anthropic Messages API 格式，实现统一接入。

### 请求转换

| Codex (输入) | Anthropic (输出) |
|--------------|------------------|
| `input` / `messages` | `messages` |
| `instructions` / `role: system` | `system` |
| `tools` | `tools` (过滤 web_search/mcp) |
| `reasoning.effort` | `thinking.budget_tokens` |
| `temperature` / `top_p` | 直接映射 |

### 响应转换

将 Anthropic 的 content blocks 转换为 OpenAI Responses 格式的 output items，包括：
- `message` / `output_text`
- `function_call`

## 快速开始

```bash
cp .env.example .env
# 编辑 .env 填入 API Key

npm install
npm run dev
```

服务启动后监听 `http://0.0.0.0:53220/v1/responses`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ANTHROPIC_API_KEY` | 必填 | API Key |
| `ANTHROPIC_BASE_URL` | `https://api.minimaxi.com/anthropic` | 目标端点 |
| `DEFAULT_MODEL` | 必填 | 默认模型 |
| `DEFAULT_REASONING_EFFORT` | `none` | 默认推理强度 |
| `PORT` | `53220` | 服务端口 |

## API 端点

### `POST /v1/responses`

支持流式 (`stream: true`) 和非流式模式。

### `GET /health`

健康检查。

## 项目结构

```
src/
├── index.ts              # Hono 服务器入口
├── types.ts              # 类型定义
├── translation/
│   ├── request.ts        # Codex → Anthropic 请求转换
│   └── response.ts       # Anthropic → Codex 响应转换
├── proxy/
│   ├── stream-handler.ts  # SSE 流式事件处理
│   └── sse-parser.ts      # SSE 格式工具
└── utils/
    └── logger.ts         # 日志工具
```

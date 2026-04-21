/**
 * OpenAI Responses API - Request Types
 * https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses
 */

/** Model name for the Responses API */
export type ResponsesModel =
  | "qwen3.6-plus"
  | "qwen3.6-plus-2026-04-02"
  | "qwen3.5-plus"
  | "qwen3.5-plus-2026-02-15"
  | "qwen-plus"
  | "qwen-plus-latest"
  | "qwen-plus-2025-09-11"
  | "qwen3.6-max-preview"
  | "qwen3-max"
  | "qwen3-max-2026-01-23"
  | "qwen3-max-preview"
  | "qwen3.6-flash"
  | "qwen3.6-flash-2026-04-16"
  | "qwen3.5-flash"
  | "qwen3.5-flash-2026-02-23"
  | "qwen-flash"
  | "qwen-flash-2025-07-28"
  | "qwen-turbo"
  | "qwen-turbo-latest"
  | "qwen3-coder-next"
  | "qwen3-coder-plus"
  | "qwen3-coder-plus-2025-09-23"
  | "qwen3-coder-flash"
  | "qwen3-vl-plus"
  | "qwen3-vl-flash"
  | "qwen-vl-max"
  | "qwen-vl-plus"
  | "kimi-k2.5"
  | "kimi-k2-thinking"
  | "glm-5.1"
  | "glm-5"
  | "glm-4.7"
  | "glm-4.6"
  | "MiniMax-M2.5"
  | "MiniMax-M2.1"
  | string;

/** Role of the message sender */
export type MessageRole = "user" | "assistant" | "system" | "developer" | "tool";

/** A single message in the conversation */
export interface Message {
  role: MessageRole;
  content: string | ContentItem[];
}

/** Content item for structured messages */
export interface ContentItem {
  type: string;
  [key: string]: unknown;
}

/** Tool definition for the Responses API */
export interface ToolDefinition {
  type: string;
  name?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Reasoning effort control object */
export interface ReasoningConfig {
  effort?: "low" | "medium" | "high" | "minimal" | string;
  [key: string]: unknown;
}

/** Tool choice configuration */
export type ToolChoice = "auto" | "none" | "required" | ToolChoiceObject;

export interface ToolChoiceObject {
  type: string;
  name?: string;
  [key: string]: unknown;
}

/** Request body for the OpenAI Responses API */
export interface ResponsesRequest {
  /** Model name (required) */
  model: ResponsesModel;
  /** Model input (required) - string or array of messages */
  input: string | Message[];
  /** System instruction inserted at the start of context */
  instructions?: string;
  /** Previous response ID for multi-turn conversation */
  previous_response_id?: string;
  /** Conversation ID for conversation-based context */
  conversation?: string;
  /** Enable streaming output (default: false) */
  stream?: boolean;
  /** Store response for future use with previous_response_id (default: true) */
  store?: boolean;
  /** Tools available for the model to call */
  tools?: ToolDefinition[];
  /** Control how the model selects tools */
  tool_choice?: ToolChoice;
  /** Sampling temperature [0, 2) */
  temperature?: number;
  /** Nucleus sampling threshold (0, 1.0] */
  top_p?: number;
  /** Enable thinking mode (non-standard, deprecated in favor of reasoning.effort) */
  enable_thinking?: boolean;
  /** Control reasoning intensity */
  reasoning?: ReasoningConfig;
  /** Stop sequences */
  stop?: string | string[];
  /** Maximum output tokens */
  max_output_tokens?: number;
  /** Truncation strategy */
  truncation?: "auto" | "disabled";
  /** Parallel tool calls enabled */
  parallel_tool_calls?: boolean;
  /** Extra body parameters */
  extra_body?: Record<string, unknown>;
  [key: string]: unknown;
}

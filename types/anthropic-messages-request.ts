/**
 * Anthropic Messages API - Request Types
 * https://help.aliyun.com/zh/model-studio/anthropic-api-messages
 */

/** HTTP Headers supported */
export interface AnthropicRequestHeaders {
  /** API Key authentication */
  "x-api-key"?: string;
  /** Alternative Bearer token authentication */
  Authorization?: `Bearer ${string}`;
  /** Content type */
  "Content-Type": "application/json";
  /** Beta header (NOT supported) */
  "anthropic-beta"?: never;
  /** Version header (NOT supported) */
  "anthropic-version"?: never;
}

/** Model name for the Anthropic-compatible API */
export type AnthropicModel =
  // Qwen Max series
  | "qwen3.6-max-preview"
  | "qwen3-max"
  | "qwen3-max-2026-01-23"
  | "qwen3-max-preview"
  // Qwen Plus series
  | "qwen3.6-plus"
  | "qwen3.6-plus-2026-04-02"
  | "qwen3.5-plus"
  | "qwen3.5-plus-2026-02-15"
  | "qwen-plus"
  | "qwen-plus-latest"
  | "qwen-plus-2025-09-11"
  // Qwen Flash series
  | "qwen3.6-flash"
  | "qwen3.6-flash-2026-04-16"
  | "qwen3.5-flash"
  | "qwen3.5-flash-2026-02-23"
  | "qwen-flash"
  | "qwen-flash-2025-07-28"
  // Qwen Turbo series
  | "qwen-turbo"
  | "qwen-turbo-latest"
  // Qwen Coder series
  | "qwen3-coder-next"
  | "qwen3-coder-plus"
  | "qwen3-coder-plus-2025-09-23"
  | "qwen3-coder-flash"
  // Qwen VL series
  | "qwen3-vl-plus"
  | "qwen3-vl-flash"
  | "qwen-vl-max"
  | "qwen-vl-plus"
  // Qwen Open Source
  | "qwen3.5-397b-a17b"
  | "qwen3.5-120b-a10b"
  | "qwen3.5-27b"
  | "qwen3.5-35b-a3b"
  // Third-party models (Beijing only)
  | "kimi-k2.5"
  | "kimi-k2-thinking"
  | "glm-5.1"
  | "glm-5"
  | "glm-4.7"
  | "glm-4.6"
  | "MiniMax-M2.5"
  | "MiniMax-M2.1"
  | string;

/** Message role */
export type AnthropicMessageRole = "user" | "assistant";

/** Cache control type */
export interface CacheControl {
  type: "ephemeral";
}

/** Citation types (NOT supported) */
export type CitationType = "char_location" | "page_location" | "content_block_location";

export interface Citation {
  type: CitationType;
  [key: string]: unknown;
}

/** Text content block */
export interface TextContentBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
  citations?: never; // NOT supported
}

/** Image source types */
export type ImageSourceType = "url" | "base64";

export interface ImageSource {
  type: ImageSourceType;
  media_type?: string; // Required when type is "base64"
  data?: string; // Required when type is "base64"
  url?: string; // Required when type is "url"
}

/** Image content block */
export interface ImageContentBlock {
  type: "image";
  source: ImageSource;
}

/** Video source types */
export type VideoSourceType = "url" | "base64";

export interface VideoSource {
  type: VideoSourceType;
  media_type?: string; // Required when type is "base64"
  data?: string; // Required when type is "base64"
  url?: string; // Required when type is "url"
}

/** Video content block */
export interface VideoContentBlock {
  type: "video";
  source: VideoSource;
}

/** Document content block (NOT supported) */
export interface DocumentContentBlock {
  type: "document";
  [key: string]: unknown;
}

/** Tool use content block */
export interface ToolUseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  cache_control?: CacheControl;
}

/** Tool result content block */
export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentBlock[];
  cache_control?: CacheControl;
  is_error?: never; // NOT supported
}

/** Thinking content block (NOT supported) */
export interface ThinkingContentBlock {
  type: "thinking";
  [key: string]: unknown;
}

/** Redacted thinking content block (NOT supported) */
export interface RedactedThinkingContentBlock {
  type: "redacted_thinking";
  [key: string]: unknown;
}

/** Server tool use (NOT supported) */
export interface ServerToolUseContentBlock {
  type: "server_tool_use";
  [key: string]: unknown;
}

/** Web search tool result (NOT supported) */
export interface WebSearchToolResultContentBlock {
  type: "web_search_tool_result";
  [key: string]: unknown;
}

/** Code execution tool result (NOT supported) */
export interface CodeExecutionToolResultContentBlock {
  type: "code_execution_tool_result";
  [key: string]: unknown;
}

/** MCP tool use (NOT supported) */
export interface MCPToolUseContentBlock {
  type: "mcp_tool_use";
  [key: string]: unknown;
}

/** MCP tool result (NOT supported) */
export interface MCPToolResultContentBlock {
  type: "mcp_tool_result";
  [key: string]: unknown;
}

/** Container upload (NOT supported) */
export interface ContainerUploadContentBlock {
  type: "container_upload";
  [key: string]: unknown;
}

/** Search result content block (NOT supported) */
export interface SearchResultContentBlock {
  type: "search_result";
  [key: string]: unknown;
}

/** Union of all content block types */
export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | VideoContentBlock
  | DocumentContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock
  | ThinkingContentBlock
  | RedactedThinkingContentBlock
  | ServerToolUseContentBlock
  | WebSearchToolResultContentBlock
  | CodeExecutionToolResultContentBlock
  | MCPToolUseContentBlock
  | MCPToolResultContentBlock
  | ContainerUploadContentBlock
  | SearchResultContentBlock;

/** Message in the conversation */
export interface AnthropicMessage {
  role: AnthropicMessageRole;
  content: string | ContentBlock[];
}

/** Tool definition */
export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  cache_control?: CacheControl;
}

/** Tool choice configuration */
export type AnthropicToolChoice =
  | "none"
  | "auto"
  | "any"
  | AnthropicToolChoiceTool;

export interface AnthropicToolChoiceTool {
  type: "tool";
  name: string;
}

/** Thinking mode configuration */
export interface ThinkingConfig {
  type: "enabled" | "disabled";
  budget_tokens?: number;
}

/** MCP servers configuration (NOT supported) */
export interface MCPServersConfig {
  [key: string]: unknown;
}

/** Service tier (NOT supported) */
export type ServiceTier = "auto" | "default" | string;

/** Container configuration (NOT supported) */
export interface ContainerConfig {
  [key: string]: unknown;
}

/** Metadata (NOT supported) */
export interface AnthropicMetadata {
  [key: string]: unknown;
}

/** Request body for the Anthropic Messages API */
export interface AnthropicMessagesRequest {
  /** Model name (required) */
  model: AnthropicModel;
  /** Maximum tokens to generate (required) */
  max_tokens: number;
  /** Messages array (required) */
  messages: AnthropicMessage[];
  /** System prompt */
  system?: string | { type: "text"; text: string; cache_control?: CacheControl }[];
  /** Enable streaming output */
  stream?: boolean;
  /** Temperature for controlling diversity [0, 1] */
  temperature?: number;
  /** Top-p nucleus sampling threshold (0, 1] */
  top_p?: number;
  /** Top-k sampling */
  top_k?: number;
  /** Stop sequences */
  stop_sequences?: string[];
  /** Available tools */
  tools?: AnthropicTool[];
  /** Tool choice strategy */
  tool_choice?: AnthropicToolChoice;
  /** Thinking mode */
  thinking?: ThinkingConfig;
  /** Container config (NOT supported) */
  container?: never;
  /** MCP servers (NOT supported) */
  mcp_servers?: never;
  /** Metadata (NOT supported) */
  metadata?: never;
  /** Service tier (NOT supported) */
  service_tier?: never;
  [key: string]: unknown;
}

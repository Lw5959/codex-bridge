/**
 * Anthropic Messages API - Response Types
 * Based on Anthropic Messages API specification
 */

/** Message stop reasons */
export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";

/** Stop reason details */
export interface StopReasonDetails {
  stop_reason: StopReason;
  stop_sequence?: string;
}

/** Usage information */
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/** Thinking output block */
export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
  signature: string;
}

/** Redacted thinking block */
export interface RedactedThinkingBlock {
  type: "redacted_thinking";
  data: string;
}

/** Text content block */
export interface TextBlock {
  type: "text";
  text: string;
}

/** Tool use block */
export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Content block union */
export type AnthropicContentBlock = TextBlock | ToolUseBlock | ThinkingBlock | RedactedThinkingBlock;

/** Non-streaming response */
export interface AnthropicMessagesResponse extends StopReasonDetails {
  /** Unique message ID */
  id: string;
  /** Always "message" */
  type: "message";
  /** Model used */
  model: string;
  /** Output content blocks */
  content: AnthropicContentBlock[];
  /** Stop reason */
  stop_reason: StopReason;
  /** Stop sequence if applicable */
  stop_sequence?: string | null;
  /** Token usage */
  usage: AnthropicUsage;
}

// ==================== Streaming Response Types ====================

/** Stream event types */
export type AnthropicStreamEventType =
  | "message_start"
  | "message_delta"
  | "message_stop"
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop"
  | "ping";

/** Base stream event */
export interface AnthropicStreamEventBase {
  type: AnthropicStreamEventType;
  [key: string]: unknown;
}

/** message_start event */
export interface MessageStartEvent extends AnthropicStreamEventBase {
  type: "message_start";
  message: Omit<AnthropicMessagesResponse, "stop_reason" | "stop_sequence"> & {
    stop_reason: null;
    stop_sequence: null;
  };
}

/** message_delta event */
export interface MessageDeltaEvent extends AnthropicStreamEventBase {
  type: "message_delta";
  delta: Partial<StopReasonDetails>;
  usage?: Partial<AnthropicUsage>;
}

/** message_stop event */
export interface MessageStopEvent extends AnthropicStreamEventBase {
  type: "message_stop";
}

/** Content block start event */
export interface ContentBlockStartEvent extends AnthropicStreamEventBase {
  type: "content_block_start";
  index: number;
  content_block: AnthropicContentBlock;
}

/** Content block delta types */
export type ContentBlockDeltaType =
  | "text_delta"
  | "input_json_delta"
  | "thinking_delta"
  | "signature_delta";

export interface TextDelta {
  type: "text_delta";
  text: string;
}

export interface InputJsonDelta {
  type: "input_json_delta";
  partial_json: string;
}

export interface ThinkingDelta {
  type: "thinking_delta";
  thinking: string;
}

export interface SignatureDelta {
  type: "signature_delta";
  signature: string;
}

/** Content block delta event */
export interface ContentBlockDeltaEvent extends AnthropicStreamEventBase {
  type: "content_block_delta";
  index: number;
  delta: TextDelta | InputJsonDelta | ThinkingDelta | SignatureDelta;
}

/** Content block stop event */
export interface ContentBlockStopEvent extends AnthropicStreamEventBase {
  type: "content_block_stop";
  index: number;
}

/** Ping event */
export interface PingEvent extends AnthropicStreamEventBase {
  type: "ping";
}

/** Union of all stream event types */
export type AnthropicStreamEvent =
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | PingEvent;

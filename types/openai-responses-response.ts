/**
 * OpenAI Responses API - Response Types
 * https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses
 */

/** Response status values */
export type ResponseStatus =
  | "completed"
  | "failed"
  | "in_progress"
  | "cancelled"
  | "queued"
  | "incomplete";

/** Output text annotation */
export interface OutputTextAnnotation {
  type?: string;
  [key: string]: unknown;
}

/** Output text content */
export interface OutputTextContent {
  annotations: OutputTextAnnotation[];
  text: string;
  type: "output_text";
  logprobs?: unknown[] | null;
}

/** Content block types */
export type ContentBlock = OutputTextContent | Record<string, unknown>;

/** Output item (message or tool call result) */
export interface OutputItem {
  id: string;
  content: ContentBlock[];
  role: string;
  status: ResponseStatus;
  type: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  [key: string]: unknown;
}

/** Token usage details */
export interface InputTokensDetails {
  cached_tokens: number;
  [key: string]: unknown;
}

export interface OutputTokensDetails {
  reasoning_tokens: number;
  [key: string]: unknown;
}

/** X details billing info */
export interface XDetailEntry {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  x_billing_type: string;
  [key: string]: unknown;
}

/** Token usage information */
export interface TokenUsage {
  input_tokens: number;
  input_tokens_details: InputTokensDetails;
  output_tokens: number;
  output_tokens_details: OutputTokensDetails;
  total_tokens: number;
  x_details?: XDetailEntry[];
  [key: string]: unknown;
}

/** Error object returned on failure */
export interface ResponseError {
  code: string;
  message: string;
  [key: string]: unknown;
}

/** Non-streaming response object */
export interface ResponsesResponse {
  /** Unique identifier (UUID), valid for 7 days */
  id: string;
  /** Unix timestamp (seconds) of the request */
  created_at: number;
  /** Fixed value: "response" */
  object: "response";
  /** Generation status */
  status: ResponseStatus;
  /** Model ID used for generation */
  model: string;
  /** Array of output items */
  output: OutputItem[];
  /** Token usage information */
  usage: TokenUsage;
  /** Error object (null on success) */
  error: ResponseError | null;
  /** Echo of the tools from the request */
  tools: unknown[];
  /** Echo of tool_choice from the request */
  tool_choice: "auto" | "none" | "required";
  /** Whether parallel tool calls are enabled */
  parallel_tool_calls?: boolean;
  [key: string]: unknown;
}

// ==================== Streaming Response Types ====================

/** Streaming event type identifiers */
export type StreamEventType =
  | "response.created"
  | "response.in_progress"
  | "response.output_item.added"
  | "response.content_part.added"
  | "response.output_text.delta"
  | "response.output_text.done"
  | "response.content_part.done"
  | "response.output_item.done"
  | "response.reasoning_summary_text.delta"
  | "response.reasoning_summary_text.done"
  | "response.web_search_call.in_progress"
  | "response.web_search_call.searching"
  | "response.web_search_call.completed"
  | "response.code_interpreter_call.in_progress"
  | "response.code_interpreter_call.interpreting"
  | "response.code_interpreter_call.completed"
  | "response.mcp_call_arguments.delta"
  | "response.mcp_call_arguments.done"
  | "response.mcp_call.completed"
  | "response.file_search_call.in_progress"
  | "response.file_search_call.searching"
  | "response.file_search_call.completed"
  | "response.completed";

/** Base streaming event */
export interface StreamEventBase {
  type: StreamEventType;
  sequence_number: number;
  [key: string]: unknown;
}

/** response.created event */
export interface ResponseCreatedEvent extends StreamEventBase {
  type: "response.created";
  response: Partial<ResponsesResponse> & { status: "queued" };
}

/** response.in_progress event */
export interface ResponseInProgressEvent extends StreamEventBase {
  type: "response.in_progress";
  response: Partial<ResponsesResponse> & { status: "in_progress" };
}

/** response.output_item.added event */
export interface ResponseOutputItemAddedEvent extends StreamEventBase {
  type: "response.output_item.added";
  item: OutputItem;
  output_index: number;
}

/** response.content_part.added event */
export interface ResponseContentPartAddedEvent extends StreamEventBase {
  type: "response.content_part.added";
  content_index: number;
  item_id: string;
  output_index: number;
  part: ContentBlock;
}

/** response.output_text.delta event */
export interface ResponseOutputTextDeltaEvent extends StreamEventBase {
  type: "response.output_text.delta";
  content_index: number;
  delta: string;
  item_id: string;
  logprobs: unknown[];
  output_index: number;
}

/** response.output_text.done event */
export interface ResponseOutputTextDoneEvent extends StreamEventBase {
  type: "response.output_text.done";
  content_index: number;
  item_id: string;
  logprobs: unknown[];
  output_index: number;
  text: string;
}

/** response.content_part.done event */
export interface ResponseContentPartDoneEvent extends StreamEventBase {
  type: "response.content_part.done";
  content_index: number;
  item_id: string;
  output_index: number;
  part: ContentBlock;
}

/** response.output_item.done event */
export interface ResponseOutputItemDoneEvent extends StreamEventBase {
  type: "response.output_item.done";
  item: OutputItem;
  output_index: number;
}

/** response.reasoning_summary_text.delta event */
export interface ResponseReasoningSummaryTextDeltaEvent extends StreamEventBase {
  type: "response.reasoning_summary_text.delta";
  summary_index: number;
  delta: string;
  item_id: string;
}

/** response.reasoning_summary_text.done event */
export interface ResponseReasoningSummaryTextDoneEvent extends StreamEventBase {
  type: "response.reasoning_summary_text.done";
  summary_index: number;
  text: string;
  item_id: string;
}

/** Web search call events */
export type WebSearchCallEventType =
  | "response.web_search_call.in_progress"
  | "response.web_search_call.searching"
  | "response.web_search_call.completed";

export interface WebSearchCallEvent extends StreamEventBase {
  type: WebSearchCallEventType;
  item_id?: string;
  [key: string]: unknown;
}

/** Code interpreter call events */
export type CodeInterpreterCallEventType =
  | "response.code_interpreter_call.in_progress"
  | "response.code_interpreter_call.interpreting"
  | "response.code_interpreter_call.completed";

export interface CodeInterpreterCallEvent extends StreamEventBase {
  type: CodeInterpreterCallEventType;
  item_id?: string;
  [key: string]: unknown;
}

/** File search call events */
export type FileSearchCallEventType =
  | "response.file_search_call.in_progress"
  | "response.file_search_call.searching"
  | "response.file_search_call.completed";

export interface FileSearchCallEvent extends StreamEventBase {
  type: FileSearchCallEventType;
  item_id?: string;
  [key: string]: unknown;
}

/** MCP call events */
export type MCPEventType =
  | "response.mcp_call_arguments.delta"
  | "response.mcp_call_arguments.done"
  | "response.mcp_call.completed";

export interface MCPEvent extends StreamEventBase {
  type: MCPEventType;
  delta?: string;
  item_id?: string;
  [key: string]: unknown;
}

/** response.completed event (includes full response) */
export interface ResponseCompletedEvent extends StreamEventBase {
  type: "response.completed";
  response: ResponsesResponse;
}

/** Union of all stream event types */
export type StreamEvent =
  | ResponseCreatedEvent
  | ResponseInProgressEvent
  | ResponseOutputItemAddedEvent
  | ResponseContentPartAddedEvent
  | ResponseOutputTextDeltaEvent
  | ResponseOutputTextDoneEvent
  | ResponseContentPartDoneEvent
  | ResponseOutputItemDoneEvent
  | ResponseReasoningSummaryTextDeltaEvent
  | ResponseReasoningSummaryTextDoneEvent
  | WebSearchCallEvent
  | CodeInterpreterCallEvent
  | FileSearchCallEvent
  | MCPEvent
  | ResponseCompletedEvent;

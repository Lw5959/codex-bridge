export interface CodexResponsesRequest {
  model: string;
  input?: CodexInputItem[] | string;
  instructions?: string;
  messages?: CodexMessage[];
  max_output_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: string | { type: string; function?: { name: string } };
  temperature?: number;
  top_p?: number;
  previous_response_id?: string;
  reasoning?: { effort: string; summary?: string };
  prompt_cache_key?: string;
  store?: boolean;
  text?: { format?: any; verbosity?: string };
  include?: string[];
  parallel_tool_calls?: boolean;
  client_metadata?: Record<string, string>;
}

export interface CodexMessage {
  role: string;
  content: string | CodexContentPart[];
}

export interface CodexContentPart {
  type: string;
  text?: string;
  image_url?: string;
}

export interface CodexInputItem {
  type: string;
  role?: string;
  content?: string | CodexContentPart[];
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface Tool {
  type: string;
  name?: string;
  function?: { name?: string; description?: string; parameters?: object };
  description?: string;
  parameters?: object;
  format?: { syntax?: string };
  mcp_server?: MCPServerConfig;
}

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface CodexSSEEvent {
  event: string;
  data: any;
}

// Anthropic request types
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'image'; source: { type: 'url'; url: string } | { type: 'base64'; media_type: string; data: string } };

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  stream: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  mcp_servers?: MCPServer[];
  thinking?: { type: 'enabled'; budget_tokens: number };
  reasoning_effort?: string;
  temperature?: number;
  top_p?: number;
  metadata?: Record<string, unknown>;
}

export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// OpenAI Responses output types
export interface OutputContentBlock {
  type: string;
  text: string;
  annotations?: any[];
}

export interface OutputItem {
  type: 'message' | 'function_call';
  id?: string;
  status: string;
  role?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  content?: OutputContentBlock[];
}

// MCP (Model Context Protocol) JSON-RPC 2.0 Types

export interface MCPJsonRPCRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPJsonRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
}

export interface MCPJsonRPCError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type MCPJsonRPCResult = MCPJsonRPCResponse | MCPJsonRPCError;

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPToolInputSchema {
  type: "object";
  properties?: Record<string, MCPSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface MCPSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  items?: MCPSchemaProperty;
  properties?: Record<string, MCPSchemaProperty>;
  required?: string[];
}

export interface MCPToolsListResult {
  tools: MCPTool[];
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

// MCP Methods
export const MCP_METHODS = {
  INITIALIZE: "initialize",
  TOOLS_LIST: "tools/list",
  TOOLS_CALL: "tools/call",
  RESOURCES_LIST: "resources/list",
  RESOURCES_READ: "resources/read",
  PROMPTS_LIST: "prompts/list",
  CANCEL: "notifications/cancelled",
} as const;

// MCP Error Codes
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARTS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

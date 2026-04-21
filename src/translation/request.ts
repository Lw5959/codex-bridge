import type {
  CodexInputItem,
  CodexResponsesRequest,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicRequest,
  MCPServer,
} from '../types';

const REASONING_EFFORT_BUDGET: Record<string, number> = {
  minimal: 256,
  low: 1024,
  medium: 4096,
  high: 8192,
  xhigh: 16384,
};

function inputItemsToAnthropicMessages(input: CodexInputItem[] | string | undefined): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];

  if (!input) return messages;
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
    return messages;
  }

  for (const item of input) {
    if ('role' in item) {
      const role = item.role;
      if (role === 'developer' || role === 'system') continue;
      const oaiRole = role as 'user' | 'assistant';
      if (typeof item.content === 'string') {
        messages.push({ role: oaiRole, content: item.content });
      } else if (Array.isArray(item.content)) {
        const blocks: AnthropicContentBlock[] = item.content.map((part) => {
          if (part.type === 'input_text' || part.type === 'text') {
            return { type: 'text', text: part.text || '' };
          }
          if (part.type === 'output_text') {
            return { type: 'text', text: part.text || '' };
          }
          return { type: 'text', text: JSON.stringify(part) };
        });
        messages.push({ role: oaiRole, content: blocks });
      }
    } else if (item.type === 'function_call') {
      // For MCP namespace tools, the name is just the namespace prefix and the actual
      // function name is in arguments.cmd. We need to construct the full tool name
      // that matches what was sent in the tools array.
      let toolName = item.name || '';
      if (item.arguments) {
        try {
          const args = JSON.parse(item.arguments);
          if (args.cmd && typeof args.cmd === 'string') {
            // If cmd doesn't already start with the namespace prefix, prepend it
            if (!toolName || !args.cmd.startsWith(toolName)) {
              // Remove trailing __ from namespace to avoid triple underscores
              const ns = toolName.replace(/__$/, '');
              toolName = ns ? `${ns}__${args.cmd}` : args.cmd;
            }
          }
        } catch { /* ignore parse errors */ }
      }
      const toolUse: AnthropicContentBlock = {
        type: 'tool_use',
        id: item.call_id || '',
        name: toolName,
        input: (() => {
          try { return item.arguments ? JSON.parse(item.arguments) : {}; } catch { return {}; }
        })(),
      };
      const last = messages.at(-1);
      if (last?.role === 'assistant' && Array.isArray(last.content)) {
        last.content.push(toolUse);
      } else {
        messages.push({ role: 'assistant', content: [toolUse] });
      }
    } else if (item.type === 'function_call_output') {
      const toolResult: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: item.call_id || '',
        content: item.output || '',
      };
      const last = messages.at(-1);
      if (last?.role === 'user' && Array.isArray(last.content)) {
        last.content.push(toolResult);
      } else {
        messages.push({ role: 'user', content: [toolResult] });
      }
    }
  }

  return messages;
}

function convertTool(t: any): unknown | null {
  // Skip MCP server tools (handled separately)
  if (t.type === 'mcp' || t.mcp_server) return null;
  // Skip web_search tools
  if (t.type === 'web_search') return null;

  const fn: any = {
    name: t.name || t.function?.name || '',
    description: t.description || t.function?.description || '',
  };
  if (t.input_schema) {
    fn.input_schema = t.input_schema;
  } else if (t.parameters || t.function?.parameters) {
    fn.input_schema = t.parameters || t.function?.parameters;
  } else if (t.type === 'custom' && t.format) {
    fn.input_schema = {
      type: 'object',
      properties: { _raw_format: { type: 'string', description: t.format?.syntax || '' } },
      required: [],
    };
  } else {
    fn.input_schema = { type: 'object', properties: {} };
  }

  return fn.name ? fn : null;
}

function convertTools(tools: any[] | undefined): { tools: unknown[]; mcpServers: MCPServer[] } {
  const resultTools: unknown[] = [];
  const mcpServers: MCPServer[] = [];

  if (!tools?.length) return { tools: resultTools, mcpServers };

  for (const t of tools) {
    // Handle MCP server tools
    if (t.type === 'mcp' || t.mcp_server) {
      const mcpServer = t.mcp_server;
      if (mcpServer) {
        mcpServers.push({
          name: t.name || t.function?.name || '',
          command: mcpServer.command,
          args: mcpServer.args,
          env: mcpServer.env,
        });
      }
      continue;
    }

    // Handle namespace tools: expand nested tools with prefixed names
    if (t.type === 'namespace' && Array.isArray(t.tools)) {
      // Strip trailing __ from namespace name to avoid triple+ underscores
      const nsPrefix = (t.name || '').replace(/__$/, '');
      for (const nestedTool of t.tools) {
        const baseName = nestedTool.name || nestedTool.function?.name || '';
        const converted = convertTool({
          ...nestedTool,
          name: nsPrefix ? `${nsPrefix}__${baseName}` : baseName,
        });
        if (converted) resultTools.push(converted);
      }
      continue;
    }

    // Convert regular function tools
    const converted = convertTool(t);
    if (converted) resultTools.push(converted);
  }

  return { tools: resultTools, mcpServers };
}

function convertToolChoice(toolChoice: any): unknown {
  if (!toolChoice) return undefined;
  if (toolChoice === 'required') return { type: 'tool', name: '*' };
  if (toolChoice === 'none') return undefined;
  if (typeof toolChoice === 'object') return toolChoice;
  return undefined;
}

export function translateCodexToAnthropicRequest(
  req: CodexResponsesRequest,
  modelId: string,
  defaultReasoningEffort?: string,
): AnthropicRequest {
  const messages = inputItemsToAnthropicMessages(req.input);
  const systemParts: string[] = [];

  // Collect system content from messages
  if (req.messages) {
    for (const msg of req.messages) {
      if (msg.role === 'system' || msg.role === 'developer') {
        if (typeof msg.content === 'string') {
          systemParts.push(msg.content);
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'input_text' || part.type === 'text') {
              systemParts.push(part.text || '');
            }
          }
        }
      }
    }
  }

  // Instructions as system
  if (req.instructions) {
    systemParts.unshift(req.instructions);
  }

  const body: AnthropicRequest = {
    model: modelId,
    messages,
    max_tokens: req.max_output_tokens || 8192,
    stream: req.stream || false,
  };

  if (systemParts.length > 0) {
    body.system = systemParts.join('\n\n');
  }

  // Thinking budget: request reasoning param takes priority, fall back to env default
  const effort = req.reasoning?.effort || defaultReasoningEffort;
  if (effort && effort !== 'none') {
    const budget = REASONING_EFFORT_BUDGET[effort] ?? 8192;
    body.thinking = { type: 'enabled', budget_tokens: budget };
  }

  // Tools & MCP servers
  const { tools, mcpServers } = convertTools(req.tools);
  if (tools.length > 0) {
    body.tools = tools;
    if (req.tool_choice !== undefined) {
      body.tool_choice = convertToolChoice(req.tool_choice);
    }
  }
  if (mcpServers.length > 0) {
    body.mcp_servers = mcpServers;
  }

  // Temperature / top_p
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.top_p !== undefined) body.top_p = req.top_p;

  // Stop sequences
  if (req.stop !== undefined) {
    body.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];
  }

  // Metadata
  const metadata: Record<string, unknown> = {};
  if (req.prompt_cache_key) metadata.prompt_cache_key = req.prompt_cache_key;
  if (Object.keys(metadata).length > 0) body.metadata = metadata;

  return body;
}

export function mapModel(_model: string, defaultModel?: string): string {
  return defaultModel || 'MiniMax-M2.7-highspeed';
}

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
      const toolUse: AnthropicContentBlock = {
        type: 'tool_use',
        id: item.call_id || '',
        name: item.name || '',
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

    // Skip web_search tools (not supported by Anthropic)
    if (t.type === 'web_search') continue;

    // Convert regular function tools
    const fn: any = {
      name: t.name || t.function?.name || '',
      description: t.description || t.function?.description || '',
    };
    if (t.parameters || t.function?.parameters) {
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

    // Only add if has a valid name
    if (fn.name) {
      resultTools.push(fn);
    }
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

  // Metadata
  const metadata: Record<string, unknown> = {};
  if (req.prompt_cache_key) metadata.prompt_cache_key = req.prompt_cache_key;
  if (Object.keys(metadata).length > 0) body.metadata = metadata;

  return body;
}

export function mapModel(_model: string, defaultModel?: string): string {
  return defaultModel || 'MiniMax-M2.7-highspeed';
}

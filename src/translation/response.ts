import type { OutputItem } from '../types';

export interface CodexResponse {
  id: string;
  object: string;
  model: string;
  created_at: number;
  status: string;
  output: OutputItem[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_tokens_details?: { cached_tokens: number };
    output_tokens_details?: { reasoning_tokens: number };
    x_details?: { input_tokens: number; output_tokens: number; total_tokens: number; x_billing_type: string }[];
  };
  previous_response_id?: string;
  parallel_tool_calls?: boolean;
  tool_choice?: string;
  tools?: any[];
  error?: null;
}

export function transformResponse(resp: any, originalModel: string): CodexResponse {
  const output: OutputItem[] = [];

  for (const block of resp.content || []) {
    if (block.type === 'text') {
      output.push({
        type: 'message',
        id: `msg_${resp.id}`,
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_text', text: block.text, annotations: [] }],
      });
    } else if (block.type === 'tool_use') {
      output.push({
        type: 'function_call',
        id: `fc_${resp.id}`,
        status: 'completed',
        name: block.name,
        arguments: JSON.stringify(block.input || {}),
        call_id: block.id,
      });
    }
  }

  const result: CodexResponse = {
    id: `resp_${resp.id}`,
    object: 'response',
    model: originalModel,
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    output,
    parallel_tool_calls: false,
    tool_choice: 'auto',
    tools: [],
    error: null,
  };

  if (resp.usage) {
    const inputTokens = resp.usage.input_tokens || 0;
    const outputTokens = resp.usage.output_tokens || 0;
    result.usage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
      x_details: [{
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        x_billing_type: 'response_api',
      }],
    };
  }

  return result;
}

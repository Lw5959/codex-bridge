import type { OutputItem } from '../types';

export interface CompletionEvent {
  eventType: string;
  data: Record<string, any>;
}

export interface StreamHandler {
  responseId: string;
  /** The actual message ID, available after message_start event */
  get messageId(): string;
  /** Returns completion events to emit when a content block completes */
  handleEvent(raw: any): CompletionEvent[];
  getFinalResponse(): OutputItem[];
}

export function createStreamHandler(): StreamHandler {
  const responseId = `resp_${Math.random().toString(36).slice(2)}`;
  const accumulatedItems: Map<number, { type: string; text: string; name?: string; inputText?: string; blockId?: string }> = new Map();
  const outputItems: OutputItem[] = [];
  let messageId = `msg_${responseId}`;

  return {
    responseId,

    get messageId() {
      return messageId;
    },

    handleEvent(raw: any): CompletionEvent[] {
      const events: CompletionEvent[] = [];
      const eventType = raw.event;
      const data = raw.data;
      if (!data || typeof data !== 'object') return events;

      switch (eventType) {
        case 'message_start': {
          const msg = data.message;
          if (msg?.id) messageId = msg.id;
          break;
        }

        case 'content_block_start': {
          const block = data.content_block;
          const idx = data.index ?? 0;
          if (block?.type === 'text') {
            accumulatedItems.set(idx, { type: 'text', text: '', blockId: block.id });
          } else if (block?.type === 'tool_use') {
            accumulatedItems.set(idx, { type: 'tool_use', text: '', name: block.name || '', inputText: '', blockId: block.id });
          } else if (block?.type === 'thinking') {
            accumulatedItems.set(idx, { type: 'thinking', text: '', blockId: block.id });
          } else if (block?.type === 'redacted_thinking') {
            accumulatedItems.set(idx, { type: 'redacted_thinking', text: block.data || '', blockId: block.id });
          }
          break;
        }

        case 'content_block_delta': {
          const delta = data.delta;
          const idx = data.index ?? 0;
          const item = accumulatedItems.get(idx);
          if (!item) return events;

          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            item.text += delta.text;
          } else if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
            item.inputText = (item.inputText || '') + delta.partial_json;
          } else if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
            item.text += delta.thinking;
          }
          break;
        }

        case 'content_block_stop': {
          const idx = data.index ?? 0;
          const item = accumulatedItems.get(idx);
          if (!item) return events;

          if (item.type === 'text' && item.text) {
            const outputItem: OutputItem = {
              type: 'message',
              id: messageId,
              status: 'completed',
              role: 'assistant',
              content: [{ type: 'output_text', text: item.text, annotations: [] }],
            };
            outputItems.push(outputItem);

            events.push({
              eventType: 'response.output_text.done',
              data: {
                content_index: 0,
                item_id: messageId,
                logprobs: [],
                output_index: 0,
                text: item.text,
                type: 'response.output_text.done',
              },
            });
            events.push({
              eventType: 'response.content_part.done',
              data: {
                content_index: 0,
                item_id: messageId,
                output_index: 0,
                part: { annotations: [], text: item.text, type: 'output_text', logprobs: null },
                type: 'response.content_part.done',
              },
            });
          } else if (item.type === 'tool_use' && item.name) {
            let args = {};
            try { if (item.inputText) args = JSON.parse(item.inputText); } catch { /* ignore */ }

            outputItems.push({
              type: 'function_call',
              id: `fc_${responseId}`,
              status: 'completed',
              name: item.name,
              arguments: JSON.stringify(args),
              call_id: item.blockId || '',
            });
          } else if (item.type === 'thinking' && item.text) {
            const reasoningItem: OutputItem = {
              type: 'message',
              id: messageId,
              status: 'completed',
              role: 'assistant',
              content: [{ type: 'reasoning_summary_text', text: item.text }],
            };
            outputItems.push(reasoningItem);
            events.push({
              eventType: 'response.reasoning_summary_text.done',
              data: {
                summary_index: 0,
                text: item.text,
                item_id: messageId,
                type: 'response.reasoning_summary_text.done',
              },
            });
          } else if (item.type === 'redacted_thinking') {
            const redactedItem: OutputItem = {
              type: 'message',
              id: messageId,
              status: 'completed',
              role: 'assistant',
              content: [{ type: 'redacted_thinking', data: item.text }],
            };
            outputItems.push(redactedItem);
          }

          const outputItem = outputItems[outputItems.length - 1];
          if (outputItem) {
            events.push({
              eventType: 'response.output_item.done',
              data: { item: outputItem, output_index: 0, type: 'response.output_item.done' },
            });
          }

          accumulatedItems.delete(idx);
          break;
        }

        case 'message_stop':
        case 'message_delta':
          break;
      }

      return events;
    },

    getFinalResponse(): OutputItem[] {
      return outputItems;
    },
  };
}

// SSE format helpers
export function sseEvent(eventType: string, data: any): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseData(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

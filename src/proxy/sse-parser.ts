import type { CodexSSEEvent } from '../types';

export async function* parseSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<CodexSSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of stream as any) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          yield { event: 'message', data: JSON.parse(data) };
        } catch {
          yield { event: 'message', data: trimmed };
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data:')) {
      const data = trimmed.slice(5).trim();
      if (data !== '[DONE]') {
        try {
          yield { event: 'message', data: JSON.parse(data) };
        } catch {
          yield { event: 'message', data: trimmed };
        }
      }
    }
  }
}

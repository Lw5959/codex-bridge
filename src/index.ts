import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import Anthropic from "@anthropic-ai/sdk";

import {
  translateCodexToAnthropicRequest,
  mapModel,
} from "./translation/request";
import { transformResponse } from "./translation/response";
import { createStreamHandler, sseEvent, sseData } from "./proxy/stream-handler";
import { logger } from "./utils/logger";
import type { CodexResponsesRequest } from "./types";

const PORT = parseInt(process.env.PORT || "53220");
const DEFAULT_MODEL = process.env.DEFAULT_MODEL;
const DEFAULT_REASONING_EFFORT =
  process.env.DEFAULT_REASONING_EFFORT || "none";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL:
    process.env.ANTHROPIC_BASE_URL || "https://api.minimaxi.com/anthropic",
});

const app = new Hono();

app.use("*", async (c, next) => {
  const start = Date.now();
  logger.info(`[${ts()}] ${c.req.method} ${c.req.path}`);
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });
  logger.info(`  Headers: ${JSON.stringify(headers)}`);
  try {
    await next();
  } finally {
    logger.info(`  ${c.res.status} ${Date.now() - start}ms`);
  }
});

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.post("/v1/responses", async (c) => {
  const reqId = Date.now().toString(36);
  logger.info(`[${reqId}] >>> POST /v1/responses`);
  try {
    const body = await c.req.json<CodexResponsesRequest>();
    logger.info(`[${reqId}] Request full body: ${JSON.stringify(body)}`);
    logger.info(
      `[${reqId}] Request body: ${JSON.stringify({
        model: body.model,
        stream: body.stream,
        input_type:
          typeof body.input === "string"
            ? "string"
            : Array.isArray(body.input)
              ? "array"
              : "undefined",
        input_preview:
          typeof body.input === "string" ? body.input.slice(0, 100) : undefined,
        tools_count: body.tools?.length || 0,
        mcp_tools: body.tools?.filter(t => t.type === 'mcp' || t.mcp_server)?.length || 0,
        prompt_cache_key: body.prompt_cache_key || "not set",
        reasoning: body.reasoning ? JSON.stringify(body.reasoning) : "not set",
        text: body.text ? JSON.stringify(body.text) : "not set",
        previous_response_id: body.previous_response_id || "not set",
      })}`,
    );

    const modelId = mapModel(body.model, DEFAULT_MODEL);
    const anthropicReq = translateCodexToAnthropicRequest(
      body,
      modelId,
      DEFAULT_REASONING_EFFORT,
    );
    logger.info(`[${reqId}] Anthropic request model: ${modelId}`);
    logger.info(`[${reqId}] Anthropic request full body: ${JSON.stringify(anthropicReq)}`);
    logger.info(
      `[${reqId}] Anthropic request body: ${JSON.stringify({
        model: anthropicReq.model,
        stream: anthropicReq.stream,
        messages_count: anthropicReq.messages?.length,
        system: anthropicReq.system ? "yes" : "no",
        tools_count: anthropicReq.tools?.length || 0,
        mcp_servers_count: anthropicReq.mcp_servers?.length || 0,
        mcp_servers: anthropicReq.mcp_servers,
        thinking: anthropicReq.thinking
          ? JSON.stringify(anthropicReq.thinking)
          : "no",
        reasoning_effort: DEFAULT_REASONING_EFFORT,
      })}`,
    );

    if (anthropicReq.stream) {
      logger.info(`[${reqId}] >>> Streaming mode`);
      const res = c.newResponse(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const write = (chunk: string) =>
              controller.enqueue(encoder.encode(chunk));
            const createdAt = Math.floor(Date.now() / 1000);

            try {
              logger.info(`[${reqId}] Creating Anthropic stream...`);
              const stream = await anthropic.messages.stream(
                anthropicReq as any,
              );
              logger.info(`[${reqId}] Anthropic stream created`);
              const handler = createStreamHandler();

              write(
                sseEvent("response.created", {
                  response: {
                    id: handler.responseId,
                    created_at: createdAt,
                    object: "response",
                    status: "queued",
                    model: body.model || modelId,
                    output: [],
                    parallel_tool_calls: body.parallel_tool_calls ?? false,
                    tool_choice: body.tool_choice || "auto",
                    tools: body.tools || [],
                  },
                  sequence_number: 0,
                  type: "response.created",
                }),
              );
              logger.info(`[${reqId}] Sent response.created`);

              write(
                sseEvent("response.in_progress", {
                  response: { id: handler.responseId, status: "in_progress" },
                  sequence_number: 1,
                  type: "response.in_progress",
                }),
              );

              let seq = 2;

              for await (const event of stream) {
                const eventType = event.type;
                logger.info(`[${reqId}] Stream chunk: ${eventType}`);

                if (eventType === "content_block_start") {
                  const block = (event as any).content_block;
                  if (block?.type === "text") {
                    const msgId = handler.messageId;
                    write(
                      sseEvent("response.output_item.added", {
                        item: {
                          id: msgId,
                          content: [],
                          role: "assistant",
                          status: "in_progress",
                          type: "message",
                        },
                        output_index: 0,
                        sequence_number: seq++,
                        type: "response.output_item.added",
                      }),
                    );
                    write(
                      sseEvent("response.content_part.added", {
                        content_index: 0,
                        item_id: msgId,
                        output_index: 0,
                        part: {
                          annotations: [],
                          text: "",
                          type: "output_text",
                          logprobs: null,
                        },
                        sequence_number: seq++,
                        type: "response.content_part.added",
                      }),
                    );
                  } else if (block?.type === "tool_use") {
                    write(
                      sseEvent("response.output_item.added", {
                        item: {
                          id: `fc_${handler.responseId}`,
                          type: "function_call",
                          name: block.name || "",
                          status: "in_progress",
                        },
                        output_index: 0,
                        sequence_number: seq++,
                        type: "response.output_item.added",
                      }),
                    );
                  } else if (block?.type === "thinking") {
                    const msgId = handler.messageId;
                    write(
                      sseEvent("response.output_item.added", {
                        item: {
                          id: msgId,
                          content: [],
                          role: "assistant",
                          status: "in_progress",
                          type: "message",
                        },
                        output_index: 0,
                        sequence_number: seq++,
                        type: "response.output_item.added",
                      }),
                    );
                    write(
                      sseEvent("response.content_part.added", {
                        content_index: 0,
                        item_id: msgId,
                        output_index: 0,
                        part: { type: "reasoning_summary_text", text: "" },
                        sequence_number: seq++,
                        type: "response.content_part.added",
                      }),
                    );
                  }
                } else if (eventType === "content_block_delta") {
                  const delta = (event as any).delta;
                  if (
                    delta?.type === "text_delta" &&
                    typeof delta.text === "string"
                  ) {
                    write(
                      sseEvent("response.output_text.delta", {
                        content_index: 0,
                        delta: delta.text,
                        item_id: handler.responseId,
                        logprobs: [],
                        output_index: 0,
                        sequence_number: seq++,
                        type: "response.output_text.delta",
                      }),
                    );
                  } else if (
                    delta?.type === "thinking_delta" &&
                    typeof delta.thinking === "string"
                  ) {
                    write(
                      sseEvent("response.reasoning_summary_text.delta", {
                        content_index: 0,
                        delta: delta.thinking,
                        item_id: handler.messageId,
                        summary_index: 0,
                        sequence_number: seq++,
                        type: "response.reasoning_summary_text.delta",
                      }),
                    );
                  }
                }

                const completionEvents = handler.handleEvent({
                  event: eventType,
                  data: event,
                });
                for (const evt of completionEvents) {
                  write(
                    sseEvent(evt.eventType, {
                      ...evt.data,
                      sequence_number: seq++,
                    }),
                  );
                }
              }

              const finalItems = handler.getFinalResponse();
              const finalMessage = await stream.finalMessage();
              const inputTokens = finalMessage.usage?.input_tokens || 0;
              const outputTokens = finalMessage.usage?.output_tokens || 0;
              logger.info(
                `[${reqId}] Stream completed. Tokens: ${inputTokens} in / ${outputTokens} out`,
              );

              write(
                sseEvent("response.completed", {
                  response: {
                    id: handler.responseId,
                    created_at: createdAt,
                    model: finalMessage.model || body.model || modelId,
                    object: "response",
                    output: finalItems,
                    status: finalMessage.stop_reason === 'max_tokens' ? 'incomplete' : 'completed',
                    usage: {
                      input_tokens: inputTokens,
                      output_tokens: outputTokens,
                      total_tokens: inputTokens + outputTokens,
                      input_tokens_details: {
                        cached_tokens:
                          (finalMessage.usage?.cache_read_input_tokens || 0) +
                          (finalMessage.usage?.cache_creation_input_tokens || 0),
                      },
                      output_tokens_details: { reasoning_tokens: 0 },
                      x_details: [
                        {
                          input_tokens: inputTokens,
                          output_tokens: outputTokens,
                          total_tokens: inputTokens + outputTokens,
                          x_billing_type: "response_api",
                        },
                      ],
                    },
                    parallel_tool_calls: body.parallel_tool_calls ?? false,
                    tool_choice: body.tool_choice || "auto",
                    tools: body.tools || [],
                  },
                  sequence_number: seq++,
                  type: "response.completed",
                }),
              );
              write("data: [DONE]\n\n");
              logger.info(`[${reqId}] Sent response.completed + [DONE]`);
            } catch (err: any) {
              logger.error(`[${reqId}] Stream error:`, err);
              write(
                sseData({
                  error: {
                    message: err.message,
                    type: "proxy_error",
                    stack: err.stack,
                  },
                }),
              );
            }

            controller.close();
            logger.info(`[${reqId}] Stream controller closed`);
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );

      return res;
    }

    logger.info(`[${reqId}] >>> Non-streaming mode`);
    const result = await anthropic.messages.create(anthropicReq as any);
    logger.info(`[${reqId}] Non-streaming response received`);
    return c.json(transformResponse(result, body.model || modelId, body.tools, body.tool_choice as string, body.parallel_tool_calls));
  } catch (err: any) {
    logger.error(`[${reqId}] Request error:`, err);
    return c.json(
      {
        error: {
          message: err.message,
          type: err.error?.type || "proxy_error",
          stack: err.stack,
        },
      },
      500,
    );
  }
});

app.all("*", (c) =>
  c.json({ error: { message: "Not found", type: "not_found" } }, 404),
);

function ts() {
  return new Date().toISOString();
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  logger.info(`codex-bridge listening on http://0.0.0.0:${info.port}`);
  logger.info(`Target: ${process.env.ANTHROPIC_BASE_URL}`);
  logger.info(`Default model: ${DEFAULT_MODEL}`);
  logger.info(`Default reasoning: ${DEFAULT_REASONING_EFFORT}`);
  logger.info(`Log dir: ${process.env.LOG_DIR || "(disabled)"}`);
});

export { app };

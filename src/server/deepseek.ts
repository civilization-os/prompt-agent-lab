import type {
  ILoopChatModel,
  LoopChatResponse,
  LoopMessage,
  LoopStreamChunk,
  LoopToolCallDelta,
  LoopToolDefinition,
} from '../agent-loop/types/model.js';

export interface DeepSeekModelOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'text' | 'json_object' };
  stop?: string | string[];
}

export class DeepSeekChatModel implements ILoopChatModel {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultOptions: DeepSeekModelOptions;
  public lastUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };

  constructor(options: DeepSeekModelOptions = {}) {
    this.apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseURL = (options.baseURL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.defaultOptions = {
      model: 'deepseek-chat',
      ...options,
    };
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API Key 未配置。请在系统设置中填入有效的 API Key 或在 .env 中设置 DEEPSEEK_API_KEY。');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private formatMessages(messages: LoopMessage[]): Array<Record<string, unknown>> {
    return messages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content || '',
      };

      if (m.name) {
        msg.name = m.name;
      }

      if (m.role === 'tool' && m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }

      if (m.role === 'assistant') {
        if (m.toolCalls && m.toolCalls.length > 0) {
          msg.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            },
          }));
        }
        if (m.reasoningContent) {
          // DeepSeek reasoner multi-turn support
          msg.reasoning_content = m.reasoningContent;
        }
      }

      return msg;
    });
  }

  private formatTools(tools?: LoopToolDefinition[]): Array<Record<string, unknown>> | undefined {
    if (!tools || tools.length === 0) return undefined;
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /**
   * 一次性调用 (Non-streaming Invoke)
   */
  public async invoke(params: {
    messages: LoopMessage[];
    tools?: LoopToolDefinition[];
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  }): Promise<LoopChatResponse> {
    const formattedMessages = this.formatMessages(params.messages);
    const formattedTools = this.formatTools(params.tools);

    const body: Record<string, unknown> = {
      model: (params.model as string) || this.defaultOptions.model || 'deepseek-chat',
      messages: formattedMessages,
      stream: false,
    };

    const temp = params.temperature ?? this.defaultOptions.temperature;
    if (temp !== undefined) body.temperature = temp;

    const maxTok = params.maxTokens ?? (params.max_tokens as number) ?? this.defaultOptions.max_tokens;
    if (maxTok !== undefined) body.max_tokens = maxTok;

    const topP = (params.top_p as number) ?? this.defaultOptions.top_p;
    if (topP !== undefined) body.top_p = topP;

    const freqPenalty = (params.frequency_penalty as number) ?? this.defaultOptions.frequency_penalty;
    if (freqPenalty !== undefined) body.frequency_penalty = freqPenalty;

    const presPenalty = (params.presence_penalty as number) ?? this.defaultOptions.presence_penalty;
    if (presPenalty !== undefined) body.presence_penalty = presPenalty;

    const respFormat = (params.response_format as { type: 'text' | 'json_object' }) ?? this.defaultOptions.response_format;
    if (respFormat) body.response_format = respFormat;

    const stop = (params.stop as string | string[]) ?? this.defaultOptions.stop;
    if (stop) body.stop = stop;

    if (formattedTools && formattedTools.length > 0 && body.model !== 'deepseek-reasoner') {
      body.tools = formattedTools;
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedMsg = errJson.error?.message || errText;
      } catch {
        // ignore
      }
      throw new Error(`DeepSeek API 响应错误 [${res.status}]: ${parsedMsg}`);
    }

    const json = (await res.json()) as {
      choices: Array<{
        message: {
          role: 'assistant';
          content?: string;
          reasoning_content?: string;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
      };
    };

    if (json.usage) {
      this.lastUsage = json.usage;
    }

    const choice = json.choices[0];
    if (!choice) {
      throw new Error('DeepSeek API 返回了空的选择列表 (choices)');
    }

    const toolCalls = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    return {
      role: 'assistant',
      content: choice.message.content || '',
      reasoningContent: choice.message.reasoning_content,
      toolCalls,
      finishReason: choice.finish_reason as LoopChatResponse['finishReason'],
      usage: json.usage
        ? {
            inputTokens: json.usage.prompt_tokens,
            outputTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * 双模态流式调用 (Streaming Generator)
   * 产出 LoopStreamChunk，供 StreamDispatcher 转化为 reasoning-delta 与 text-delta
   */
  public async *stream(params: {
    messages: LoopMessage[];
    tools?: LoopToolDefinition[];
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  }): AsyncGenerator<LoopStreamChunk, void, unknown> {
    const formattedMessages = this.formatMessages(params.messages);
    const formattedTools = this.formatTools(params.tools);

    const body: Record<string, unknown> = {
      model: (params.model as string) || this.defaultOptions.model || 'deepseek-chat',
      messages: formattedMessages,
      stream: true,
      stream_options: { include_usage: true },
    };

    const temp = params.temperature ?? this.defaultOptions.temperature;
    if (temp !== undefined) body.temperature = temp;

    const maxTok = params.maxTokens ?? (params.max_tokens as number) ?? this.defaultOptions.max_tokens;
    if (maxTok !== undefined) body.max_tokens = maxTok;

    const topP = (params.top_p as number) ?? this.defaultOptions.top_p;
    if (topP !== undefined) body.top_p = topP;

    const freqPenalty = (params.frequency_penalty as number) ?? this.defaultOptions.frequency_penalty;
    if (freqPenalty !== undefined) body.frequency_penalty = freqPenalty;

    const presPenalty = (params.presence_penalty as number) ?? this.defaultOptions.presence_penalty;
    if (presPenalty !== undefined) body.presence_penalty = presPenalty;

    const respFormat = (params.response_format as { type: 'text' | 'json_object' }) ?? this.defaultOptions.response_format;
    if (respFormat) body.response_format = respFormat;

    const stop = (params.stop as string | string[]) ?? this.defaultOptions.stop;
    if (stop) body.stop = stop;

    if (formattedTools && formattedTools.length > 0 && body.model !== 'deepseek-reasoner') {
      body.tools = formattedTools;
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedMsg = errJson.error?.message || errText;
      } catch {
        // ignore
      }
      throw new Error(`DeepSeek API 流式调用错误 [${res.status}]: ${parsedMsg}`);
    }

    if (!res.body) {
      throw new Error('DeepSeek API 返回了空的响应体');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        if (params.signal?.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);

              // 记录 token usage
              if (data.usage) {
                this.lastUsage = data.usage;
              }

              const choice = data.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta || {};
              const toolCallDeltas: LoopToolCallDelta[] = [];

              if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  toolCallDeltas.push({
                    index: tc.index,
                    id: tc.id,
                    name: tc.function?.name,
                    arguments: tc.function?.arguments,
                  });
                }
              }

              const chunk: LoopStreamChunk = {
                content: delta.content || '',
                reasoningContent: delta.reasoning_content || undefined,
                toolCallDeltas: toolCallDeltas.length > 0 ? toolCallDeltas : undefined,
                finishReason: choice.finish_reason || null,
              };

              // 只有存在有效内容时才 yield
              if (chunk.content || chunk.reasoningContent || (chunk.toolCallDeltas && chunk.toolCallDeltas.length > 0) || chunk.finishReason) {
                yield chunk;
              }
            } catch {
              // 忽略个别非法 SSE 行
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

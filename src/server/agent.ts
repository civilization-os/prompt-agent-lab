import { AgentLoop } from '../agent-loop/index.js';
import { DeepSeekChatModel, type DeepSeekModelOptions } from './deepseek.js';
import { getSelectedTools } from './tools.js';
import type { LoopEvent } from '../agent-loop/types/events.js';
import type { LoopMessage } from '../agent-loop/types/model.js';

export interface RunAgentRequest {
  systemPrompt?: string;
  messages: LoopMessage[];
  modelParams: {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    response_format?: { type: 'text' | 'json_object' };
    stop?: string | string[];
    enabledTools?: string[];
    maxIterations?: number;
    maxRepairAttempts?: number;
    maxRepeatedCalls?: number;
  };
  credentials?: {
    apiKey?: string;
    baseURL?: string;
  };
}

export class AgentRunner {
  public static async *run(
    req: RunAgentRequest,
    signal?: AbortSignal
  ): AsyncGenerator<LoopEvent & { usage?: any }, void, unknown> {
    const modelOptions: DeepSeekModelOptions = {
      apiKey: req.credentials?.apiKey,
      baseURL: req.credentials?.baseURL,
      model: req.modelParams.model || 'deepseek-chat',
      temperature: req.modelParams.temperature,
      top_p: req.modelParams.top_p,
      max_tokens: req.modelParams.max_tokens,
      frequency_penalty: req.modelParams.frequency_penalty,
      presence_penalty: req.modelParams.presence_penalty,
      response_format: req.modelParams.response_format,
      stop: req.modelParams.stop,
    };

    const chatModel = new DeepSeekChatModel(modelOptions);
    const tools = getSelectedTools(req.modelParams.enabledTools);

    const loop = new AgentLoop({
      model: chatModel,
      tools,
      config: {
        maxIterations: req.modelParams.maxIterations ?? 10,
        maxRepairAttempts: req.modelParams.maxRepairAttempts ?? 2,
        maxRepeatedCalls: req.modelParams.maxRepeatedCalls ?? 2,
        temperature: req.modelParams.temperature,
        maxTokens: req.modelParams.max_tokens,
      },
    });

    // 组装消息列表：确保首条消息是用户设置的 System Prompt
    const fullMessages: LoopMessage[] = [];
    if (req.systemPrompt && req.systemPrompt.trim()) {
      fullMessages.push({
        role: 'system',
        content: req.systemPrompt.trim(),
      });
    }

    for (const msg of req.messages) {
      // 过滤掉原本旧的 system 消息，以当前编辑的 systemPrompt 为准
      if (msg.role !== 'system') {
        fullMessages.push(msg);
      }
    }

    const stream = loop.runStream({
      messages: fullMessages,
      signal,
    });

    for await (const event of stream) {
      if (event.type === 'completed') {
        yield {
          ...event,
          usage: chatModel.lastUsage,
        };
      } else {
        yield event;
      }
    }
  }
}

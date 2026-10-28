import { AgentLoop } from '../agent-loop/index.js';
import { DeepSeekChatModel } from './deepseek.js';
import type { LoopEvent } from '../agent-loop/types/events.js';
import type { LoopMessage } from '../agent-loop/types/model.js';

export interface EvaluatorRequest {
  systemPrompt: string;
  experimentPurpose: {
    goal: string;
    expectedBehavior: string;
  };
  modelParams: Record<string, unknown>;
  conversation: LoopMessage[];
  evaluatorConfig?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    apiKey?: string;
    baseURL?: string;
  };
}

export const DEFAULT_EVALUATOR_SYSTEM_PROMPT = `你是一位严谨客观的资深 AI 提示词工程专家（Prompt Engineer）与智能体系统质量评测裁判。
你的任务是审查用户的这一组实验：深入分析被测模型在给定的系统提示词（System Prompt）下，是否成功达到了实验目的并符合预期的行为表现。

请按以下固定结构输出完整的中文评测报告：

### 🎯 1. 实验总体评价与裁决
- **裁决结论**：[完全符合预期 (PASS) | 部分符合预期 (PARTIAL) | 不符合预期 (FAIL)]
- **综合得分**：[0 ~ 100 分]
- **一句话总结**：对本次实验成效的精炼点评。

### 📋 2. 行为准则与提示词遵从度分析
- 分析被测模型在面对用户输入时，是否严格执行了 System Prompt 中的身份、限制、格式或风格约束。
- 是否存在“破窗效应”或遗漏约束（如被禁止的行为依然发生、强制的格式缺失等）。

### 🔍 3. 实验目的达成度核验
- **设想的实验目的**：用户期望达到的目标行为。
- **实际行为表现**：实际输入输出中模型的反应（包括思考过程、工具调用与最终文本）。
- **偏差分析**：哪些细节达成了预期，哪些细节存在偏离。

### 💡 4. 关键亮点与问题细节
- **做得好的地方 (Strengths)**：条列列出符合预期的亮点。
- **存在的问题 (Deficiencies)**：条列列出偏离预期或不足之处。

### 🛠️ 5. System Prompt 针对性优化方案 (建议)
- **诊断分析**：为什么被测模型会出现上述偏差？
- **优化后的 System Prompt 建议草案**：直接提供一份优化改进后的系统提示词片段或完整版本，帮助用户一键迭代实验！

并在报告最后输出一个严格的 JSON 元数据块，格式如下（请务必保留代码块标记）：
\`\`\`json:evaluation_meta
{
  "verdict": "PASS", // PASS, PARTIAL, FAIL
  "score": 92,
  "summary": "一句话总结"
}
\`\`\``;

export class EvaluatorAgent {
  public static async *runEvaluationStream(
    req: EvaluatorRequest,
    signal?: AbortSignal
  ): AsyncGenerator<LoopEvent, void, unknown> {
    const evaluatorSysPrompt = req.evaluatorConfig?.systemPrompt || DEFAULT_EVALUATOR_SYSTEM_PROMPT;
    const modelName = req.evaluatorConfig?.model || 'deepseek-chat';
    const temperature = req.evaluatorConfig?.temperature ?? 0.3;

    const chatModel = new DeepSeekChatModel({
      apiKey: req.evaluatorConfig?.apiKey,
      baseURL: req.evaluatorConfig?.baseURL,
      model: modelName,
      temperature,
    });

    const loop = new AgentLoop({
      model: chatModel,
      config: {
        maxIterations: 5,
        temperature,
      },
    });

    // 组织评测上下文
    const conversationSummary = req.conversation
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
      .map((m, idx) => {
        let text = `[第 ${idx + 1} 条消息 | 角色: ${m.role}]:\n${m.content || '(无纯文本正文)'}`;
        if (m.reasoningContent) {
          text += `\n[思考过程/Reasoning]:\n${m.reasoningContent}`;
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          text += `\n[工具调用]: ${JSON.stringify(m.toolCalls, null, 2)}`;
        }
        return text;
      })
      .join('\n\n--------------------\n\n');

    const evalInput = `请对以下 Prompt 实验进行全面评审：

==============================
【1. 被测试的 System Prompt】
==============================
${req.systemPrompt || '（未设置系统提示词）'}

==============================
【2. 被测试的 Model 配置】
==============================
${JSON.stringify(req.modelParams, null, 2)}

==============================
【3. 用户设定的实验目的】
==============================
🎯 预期达成的行为目标：
${req.experimentPurpose.goal || '（未明确填写目标）'}

📋 期望的行为评判标准：
${req.experimentPurpose.expectedBehavior || '（未明确填写标准）'}

==============================
【4. 实验实际对话与执行过程】
==============================
${conversationSummary || '（暂无有效对话记录）'}

==============================
请根据以上所有实验数据，给出专业且深入的评测报告。`;

    const messages: LoopMessage[] = [
      { role: 'system', content: evaluatorSysPrompt },
      { role: 'user', content: evalInput },
    ];

    yield* loop.runStream({ messages, signal });
  }
}

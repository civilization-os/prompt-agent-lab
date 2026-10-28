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
你的任务是审查用户的这一组实验：深入比对用户的【实验目的】与【预期行为标准】，严格审查被测模型在给定的系统提示词（System Prompt）下，是否成功达到了设想的行为表现。

请按以下清晰的模块化结构输出中文评测报告（严格包含以下标题）：

### 🎯 1. 实验总体评价与裁决
- **裁决结论**：[完全符合预期 (PASS) | 部分符合预期 (PARTIAL) | 不符合预期 (FAIL)]
- **综合得分**：[0 ~ 100 分]
- **一句话总结**：对本次实验成效的精炼点评。

### 🔍 2. 实验目的与预期行为达成核验
- **基准目标对比**：将被测模型的实际输出与用户设定的【实验目的】及【期望行为标准】逐条核验。
- **达成情况**：哪些预期行为得到了兑现，哪些设想目标出现了偏离。

### 📋 3. 提示词规则与约束遵从度
- 逐条审查被测模型是否严格执行了 System Prompt 中的所有强制约束（如身份限制、字数限制、反问数量、格式约束等）。
- 是否存在“破窗效应”（例如规定不可回答却依然回答，或规定反问数量不足）。

### 💡 4. 关键亮点与缺陷对照
- **做得好的地方 (Strengths)**：
  - 条目 1：...
  - 条目 2：...
- **存在的问题 (Deficiencies)**：
  - 条目 1：...
  - 条目 2：...

### 🩺 5. 核心根因诊断分析
深入剖析导致上述偏差的深层机理，请按条目清晰列出（每个根因需包含核心标签与详细推导）：
- **【根因一：提示词权重与注意力失衡】**：...
- **【根因二：极端与极简输入兜底缺失】**：...
- **【根因三：参数与采样风格影响】**：...

### 🛠️ 6. System Prompt 针对性优化方案
- **修改思路**：说明优化后的提示词如何解决上述根因。
- **优化后的 System Prompt 建议草案**（请务必用 \`\`\`prompt 代码块完整包裹，方便用户一键采纳）：
\`\`\`prompt
[优化后的完整 System Prompt 内容]
\`\`\`

并在报告最后输出一个严格的 JSON 元数据块，格式如下（请务必保留代码块标记）：
\`\`\`json:evaluation_meta
{
  "verdict": "PASS", // PASS, PARTIAL, FAIL
  "score": 85,
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
【1. 用户设定的实验目的与基准】(核心审查标准)
==============================
🎯 预期达成的行为目标：
${req.experimentPurpose.goal || '（未明确填写目标）'}

📋 期望的行为评判标准：
${req.experimentPurpose.expectedBehavior || '（未明确填写标准）'}

==============================
【2. 被测试的 System Prompt】
==============================
${req.systemPrompt || '（未设置系统提示词）'}

==============================
【3. 被测试的 Model 配置】
==============================
${JSON.stringify(req.modelParams, null, 2)}

==============================
【4. 实验实际对话与执行过程】
==============================
${conversationSummary || '（暂无有效对话记录）'}

==============================
请根据以上所有实验数据与设定的实验目标，给出专业、深度且严格模块化的评测报告。`;

    const messages: LoopMessage[] = [
      { role: 'system', content: evaluatorSysPrompt },
      { role: 'user', content: evalInput },
    ];

    yield* loop.runStream({ messages, signal });
  }
}

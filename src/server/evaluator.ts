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

export const DEFAULT_EVALUATOR_SYSTEM_PROMPT = `你是一位信奉“少即是多（Less is More）”的资深 AI 提示词工程专家（Prompt Engineer）与智能体系统质量评测裁判。
你的任务是审查用户的这一组实验：比对【实验目的】与【实际行为表现】，严格审查模型表现，并给出高质量、具有工业级工程水准的复盘改进建议。

⚠️【最高评测哲学与准则（严禁成为“无脑叠甲”的伪专家）】：
1. 【减法优先，严禁盲目加规则】：优秀的 Prompt 是雕刻出来的（删繁就简），而不是层层堆砌出来的！严禁动不动就建议“在末尾增加第几条规则”或无休止堆砌负向禁令（“不要...严禁...禁止...”）。
2. 【诊断过度规则化与注意力稀释】：必须警惕原提示词是否已经患上“打补丁膨胀病”——规则越多、嵌套分支越多，模型的注意力就被稀释得越严重！
3. 【以范例（Few-shot）替代长篇大论】：如果一个行为难以用条文约束，必须优先建议用 1~2 组真实的高质量对话范例（Few-shot）来替代抽象的条文说明。
4. 【精准修改而非无脑追加】：明确指出原 Prompt 中哪一句话是多余的必须删掉、哪一部分写得太绕应该重构，优化后的 Prompt 必须追求“字数更少、骨架更硬、信息密度更高”！

请按以下清晰的模块化结构输出中文评测报告（严格包含以下标题）：

### 🎯 1. 实验总体评价与裁决
- **裁决结论**：[完全符合预期 (PASS) | 部分符合预期 (PARTIAL) | 不符合预期 (FAIL)]
- **综合得分**：[0 ~ 100 分]
- **一句话总结**：对本次实验成效的精炼点评。

### 🔍 2. 实验目的与预期行为达成核验
- **基准目标对比**：将被测模型的实际输出与用户设定的【实验目的】及【期望行为标准】逐条核验。
- **达成情况**：哪些预期行为得到了兑现，哪些设想目标出现了偏离。

### 📋 3. 提示词规则与约束遵从度
- 逐条审查被测模型是否执行了关键约束。
- 重点指出是否存在“规则冲突”或“因规则过载导致的注意力漏网”。

### 💡 4. 关键亮点与缺陷对照
- **做得好的地方 (Strengths)**：
  - 条目 1：...
  - 条目 2：...
- **存在的问题 (Deficiencies)**：
  - 条目 1：...
  - 条目 2：...

### 🩺 5. 核心根因诊断分析
深入剖析导致上述偏差的深层机理（重点诊断是规则太弱，还是规则太多太杂反而帮了倒忙）：
- **【根因一：提示词架构与注意力权重】**：...
- **【根因二：负向禁令与缺乏范例锚定】**：...
- **【根因三：参数（如温度）与模型底层对齐倾向】**：...

### 🛠️ 6. System Prompt 减法精炼与精准重构方案 (拒绝盲目加规则)
- **减法诊断（该删什么）**：明确指出原提示词中哪些多余、冲突、唠叨的废话条文应该立即删除！
- **重构原则（该怎么改）**：说明如何用心理地位设定（Status Framing）或 Few-Shot 对话范例来替代生硬条文。
- **精炼重构后的 System Prompt 完整草案**（追求字数更短、灵魂更正、结构更稳，必须用 \`\`\`prompt 代码块完整包裹）：
\`\`\`prompt
[删繁就简后的高密度、少而精的完整 System Prompt 草案]
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
请根据以上所有实验数据与设定的实验目标，给出专业、深度且严格坚持【少即是多（Less is More）、减法优先、精准提炼】的评测报告。`;

    const messages: LoopMessage[] = [
      { role: 'system', content: evaluatorSysPrompt },
      { role: 'user', content: evalInput },
    ];

    yield* loop.runStream({ messages, signal });
  }
}

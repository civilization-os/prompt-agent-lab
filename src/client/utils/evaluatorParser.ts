export interface ParsedEvaluation {
  cleanReport: string;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | string;
  score?: number;
  summary?: string;
  goalVerification?: string;
  adherence?: string;
  strengths: string[];
  deficiencies: string[];
  diagnosis: string[];
  suggestedPrompt?: string;
  optimizationNotes?: string;
}

export function parseEvaluationReport(rawReport: string = ''): ParsedEvaluation {
  // 1. 彻底清除末尾泄露的 JSON 元数据块 (```json:evaluation_meta ... ``` 或纯 `{ "verdict": ... }`)
  let cleanReport = rawReport
    .replace(/```(?:json:evaluation_meta|json)\s*[\s\S]*?```/gi, '')
    .replace(/\{\s*"verdict"\s*:\s*"[^"]*"[\s\S]*?\}\s*$/g, '')
    .trim();

  // 2. 提取 JSON 元数据（如有）
  let verdict = '';
  let score: number | undefined;
  let summary = '';

  const metaMatch = rawReport.match(/```json:evaluation_meta\s*([\s\S]*?)```/) || rawReport.match(/\{\s*"verdict"\s*:\s*"([^"]+)"\s*,\s*"score"\s*:\s*(\d+)[\s\S]*?\}/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[0].replace(/```json:evaluation_meta/g, '').replace(/```/g, '').trim());
      verdict = parsed.verdict || '';
      score = parsed.score;
      summary = parsed.summary || '';
    } catch {
      // ignore
    }
  }

  // 3. 从文本标题中回退提取裁决与得分（防止模型漏掉 JSON 块）
  if (!verdict) {
    if (cleanReport.includes('PASS') || cleanReport.includes('完全符合')) verdict = 'PASS';
    else if (cleanReport.includes('PARTIAL') || cleanReport.includes('部分符合')) verdict = 'PARTIAL';
    else if (cleanReport.includes('FAIL') || cleanReport.includes('不符合')) verdict = 'FAIL';
  }

  if (score === undefined) {
    const scoreMatch = cleanReport.match(/(?:综合得分|得分)[：:\s]*(\d+)\s*分?/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1], 10);
    }
  }

  if (!summary) {
    const summaryMatch = cleanReport.match(/一句话总结[：:\s]*([^\n]+)/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }
  }

  // 4. 提取优化后的 System Prompt 建议草案
  let suggestedPrompt: string | undefined;
  // 优先匹配 ```prompt 或 ```markdown 代码块
  const promptCodeMatch = cleanReport.match(/```(?:prompt|markdown|text)?\s*([\s\S]*?)```/);
  if (promptCodeMatch) {
    suggestedPrompt = promptCodeMatch[1].trim();
  } else {
    // 若模型未加代码块，尝试截取 "优化后的 System Prompt 建议草案" 之后的文本
    const draftIndex = cleanReport.indexOf('优化后的 System Prompt 建议草案');
    if (draftIndex !== -1) {
      const rest = cleanReport.slice(draftIndex + '优化后的 System Prompt 建议草案'.length).replace(/^[：:\s]+/, '');
      suggestedPrompt = rest.trim();
    }
  }

  // 5. 提取核心根因诊断分析 (Diagnosis)
  const diagnosis: string[] = [];
  const diagRegex = /(?:根因[一二三四五12345]|【根因[^】]+】|[-*•]\s*\*\*【[^】]+】\*\*)[：:\s]*([^\n]+(?:\n(?![-*•#\d]).+)*)/g;
  let match: RegExpExecArray | null;
  while ((match = diagRegex.exec(cleanReport)) !== null) {
    const text = match[0].trim();
    if (text) diagnosis.push(text);
  }

  // 如果未能正则切出，尝试按段落抓取 "5. 核心根因诊断分析" 到 "6. System Prompt" 之间的文本
  if (diagnosis.length === 0) {
    const diagSection = cleanReport.match(/(?:###\s*🩺?\s*5\.?\s*核心根因诊断分析|###\s*5\.?\s*根因诊断)([\s\S]*?)(?=###\s*🛠️?\s*6|\n\s*###|$)/i);
    if (diagSection) {
      const lines = diagSection[1].split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
      diagnosis.push(...lines);
    }
  }

  // 6. 提取亮点与缺陷
  const strengths: string[] = [];
  const deficiencies: string[] = [];

  const strengthsMatch = cleanReport.match(/做得好的地方[^\n]*\n([\s\S]*?)(?=(?:存在的问题|###|$))/i);
  if (strengthsMatch) {
    const items = strengthsMatch[1].split('\n').map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter((l) => l.length > 2);
    strengths.push(...items);
  }

  const defMatch = cleanReport.match(/存在的问题[^\n]*\n([\s\S]*?)(?=(?:###|🩺|5\.|$))/i);
  if (defMatch) {
    const items = defMatch[1].split('\n').map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter((l) => l.length > 2);
    deficiencies.push(...items);
  }

  // 7. 提取目的达成核验
  let goalVerification: string | undefined;
  const goalMatch = cleanReport.match(/(?:###\s*🔍?\s*2\.?\s*实验目的与预期行为达成核验|###\s*2\.?\s*实验目的达成度核验)([\s\S]*?)(?=###\s*📋?\s*3|\n\s*###|$)/i);
  if (goalMatch) {
    goalVerification = goalMatch[1].trim();
  }

  // 8. 提取遵从度
  let adherence: string | undefined;
  const adhMatch = cleanReport.match(/(?:###\s*📋?\s*3\.?\s*提示词规则与约束遵从度|###\s*3\.?\s*行为准则)([\s\S]*?)(?=###\s*💡?\s*4|\n\s*###|$)/i);
  if (adhMatch) {
    adherence = adhMatch[1].trim();
  }

  return {
    cleanReport,
    verdict: verdict || 'PARTIAL',
    score: score ?? 70,
    summary,
    goalVerification,
    adherence,
    strengths,
    deficiencies,
    diagnosis,
    suggestedPrompt,
  };
}

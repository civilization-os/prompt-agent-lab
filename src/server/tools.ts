import { z } from 'zod';
import { defineLoopTool, type LoopTool } from '../agent-loop/index.js';

/**
 * 1. 数学计算器工具
 */
export const calculatorTool = defineLoopTool({
  name: 'calculator',
  description: '执行精确的数学运算或表达式计算，如乘除、百分比、幂运算等。',
  schema: z.object({
    expression: z.string().describe('需要计算的数学表达式，如 "128 * 4.5" 或 "(34 + 92) / 2"'),
  }),
  execute: async ({ expression }) => {
    try {
      // 简单安全的数学运算解析（仅允许数字和基本运算符）
      const sanitized = expression.replace(/[^0-9+\-*/().%\s^]/g, '');
      if (!sanitized.trim()) {
        throw new Error('无效的算术表达式');
      }
      // 使用 Function 执行安全算术
      const calcFunc = new Function(`return (${sanitized.replace(/\^/g, '**')})`);
      const result = calcFunc();
      return {
        success: true,
        expression,
        result: Number(result),
      };
    } catch (err: any) {
      return {
        success: false,
        expression,
        error: `计算出错: ${err.message || '未知错误'}`,
      };
    }
  },
});

/**
 * 2. 模拟网络与知识库检索工具
 */
export const webSearchTool = defineLoopTool({
  name: 'web_search',
  description: '搜索互联网公开信息或知识库，获取最新事实、定义、文档或资料。',
  schema: z.object({
    query: z.string().describe('搜索关键词或问题'),
    category: z.enum(['general', 'tech', 'news']).optional().describe('检索分类'),
  }),
  execute: async ({ query, category = 'general' }) => {
    const q = query.toLowerCase();
    const now = new Date().toISOString();

    // 内置若干典型知识库数据，模拟搜索体验
    const knowledgeBase: Record<string, string> = {
      deepseek: 'DeepSeek (深度求索) 是一家专注通用人工智能（AGI）研发的中国科技公司，开源了 DeepSeek-V3 基础大模型与 DeepSeek-R1 深度思考推理模型，在数学、代码与长程逻辑推理上表现卓越。',
      agent: '智能体（AI Agent）是一种具备感知环境、自主决策与执行动作以完成特定目标的智能系统，通常包含 LLM 内核、记忆系统、规划模块与工具使用接口。',
      react: 'React 是一种用于构建用户界面的 JavaScript 库，倡导组件化与声明式 UI 编程，其最新版本包含并发渲染、Server Components 与增强 Hooks。',
      'system prompt': '系统提示词（System Prompt）是设置在大模型上下文最前端的引导性指令，用于给模型注入角色身份、规则约束、输出风格、输出格式及安全边界。',
    };

    let matchedContent = '';
    for (const [key, val] of Object.entries(knowledgeBase)) {
      if (q.includes(key)) {
        matchedContent = val;
        break;
      }
    }

    if (!matchedContent) {
      matchedContent = `关于 "${query}" 的最新检索摘要：在知识库中找到相关条目，该主题常用于工业实践中，包含多维度的核心概念与实施路径。`;
    }

    return {
      query,
      category,
      timestamp: now,
      results: [
        {
          title: `搜索结果: ${query}`,
          snippet: matchedContent,
          url: `https://search.example.com?q=${encodeURIComponent(query)}`,
        },
      ],
    };
  },
});

/**
 * 3. 获取当前时间与日期工具
 */
export const currentTimeTool = defineLoopTool({
  name: 'get_current_time',
  description: '获取当前的真实系统日期、时间与时区信息。',
  schema: z.object({
    timezone: z.string().optional().describe('目标时区，如 "Asia/Shanghai"，默认为系统本地时区'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    const formatted = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(now);

    return {
      iso: now.toISOString(),
      formatted,
      timezone: tz,
      timestamp: now.getTime(),
    };
  },
});

/**
 * 4. 便签/暂存本（Working Memory Scratchpad）
 */
const scratchpadStore = new Map<string, string>();

export const scratchpadTool = defineLoopTool({
  name: 'scratchpad',
  description: '用于在多步推理中暂存草稿、临时数据或待办清单。',
  schema: z.object({
    action: z.enum(['set', 'get', 'list', 'clear']).describe('操作类型'),
    key: z.string().optional().describe('键名'),
    value: z.string().optional().describe('暂存的内容'),
  }),
  execute: async ({ action, key, value }) => {
    if (action === 'set' && key && value !== undefined) {
      scratchpadStore.set(key, value);
      return { success: true, message: `已将内容存入 [${key}]` };
    }
    if (action === 'get' && key) {
      const val = scratchpadStore.get(key);
      return { success: true, key, value: val ?? null, exists: val !== undefined };
    }
    if (action === 'list') {
      const all: Record<string, string> = {};
      scratchpadStore.forEach((v, k) => {
        all[k] = v;
      });
      return { success: true, items: all };
    }
    if (action === 'clear') {
      scratchpadStore.clear();
      return { success: true, message: '暂存本已清空' };
    }
    return { success: false, error: '参数不足或无效' };
  },
});

export const ALL_BUILTIN_TOOLS: LoopTool<any>[] = [
  calculatorTool,
  webSearchTool,
  currentTimeTool,
  scratchpadTool,
];

export function getSelectedTools(toolNames?: string[]): LoopTool<any>[] {
  if (!toolNames || toolNames.length === 0) return [];
  const set = new Set(toolNames);
  return ALL_BUILTIN_TOOLS.filter((t) => set.has(t.name));
}

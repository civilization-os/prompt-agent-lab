import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { PRESETS } from '../presets.js';
import type { ExperimentPurpose, ModelParams } from '../types.js';

interface SystemPromptEditorProps {
  systemPrompt: string;
  onChange: (val: string) => void;
  onApplyPreset: (prompt: string, purpose: ExperimentPurpose, params?: Partial<ModelParams>) => void;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  systemPrompt,
  onChange,
  onApplyPreset,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      onApplyPreset(p.systemPrompt, p.purpose, p.recommendedParams);
    }
  };

  const insertSnippet = (snippet: string) => {
    onChange(systemPrompt ? `${systemPrompt}\n${snippet}` : snippet);
  };

  // 估算字符与 Token 数
  const charCount = systemPrompt.length;
  const approxTokens = Math.ceil(charCount * 0.7);

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-6 z-50 shadow-2xl bg-slate-900/98 backdrop-blur-xl' : 'h-full'
      }`}
    >
      {/* 头部工具条 */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-xs text-slate-200">系统提示词 (System Prompt)</span>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
            {charCount} 字符 ≈ {approxTokens} tokens
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 预设模版快速选择 */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedPresetId}
              onChange={handleSelectPreset}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[190px] truncate"
              title="切换经典实验模版"
            >
              <option value="">-- 选择实验模版 --</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 复制 */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="复制提示词"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* 清空 */}
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
            title="清空当前提示词"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* 全屏放大 */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title={isExpanded ? '还原' : '全屏编辑'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 快捷插入常用约束标签 */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap gap-1.5 text-[11px]">
        <span className="text-slate-500 self-center flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" /> 快捷约束:
        </span>
        <button
          type="button"
          onClick={() => insertSnippet('【核心准则】：\n1. 回答前先进行充分的逻辑校验；\n2. 语言保持客观精炼。')}
          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 transition-all"
        >
          + 核心准则
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('【禁止行为】：\n- 严禁猜测未提及的事实；\n- 严禁输出多余的客套话与寒暄。')}
          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-rose-300 border border-rose-900/40 transition-all"
        >
          + 负向禁令
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('【输出格式】：\n输出必须严格遵照 JSON 结构，不允许出现 markdown 代码块包裹。')}
          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-indigo-300 border border-indigo-900/40 transition-all"
        >
          + 格式约束
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('【思考引导】：\n在给出结论前，请一步一步梳理前提条件与推导链路。')}
          className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-emerald-300 border border-emerald-900/40 transition-all"
        >
          + 思维链引导
        </button>
      </div>

      {/* 文本输入区 */}
      <div className="relative flex-1 p-3">
        <textarea
          value={systemPrompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入系统提示词 (System Prompt)...&#10;定义模型的角色、行为准则、格式约束或思考风格。&#10;随时在此修改，下一次输入或重新测试将立即应用！"
          className="w-full h-full bg-transparent text-xs text-slate-100 font-mono leading-relaxed placeholder:text-slate-600 focus:outline-none resize-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Award,
  Sparkles,
  Settings2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Square,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import type { EvaluationResult, EvaluatorConfig } from '../types.js';

interface EvaluatorPanelProps {
  evaluation?: EvaluationResult;
  isEvaluating: boolean;
  onRunEvaluation: () => void;
  onAbortEvaluation: () => void;
  evaluatorConfig: EvaluatorConfig;
  onUpdateEvaluatorConfig: (cfg: Partial<EvaluatorConfig>) => void;
  onAdoptPrompt?: (prompt: string) => void;
  hasMessages: boolean;
}

export const EvaluatorPanel: React.FC<EvaluatorPanelProps> = ({
  evaluation,
  isEvaluating,
  onRunEvaluation,
  onAbortEvaluation,
  evaluatorConfig,
  onUpdateEvaluatorConfig,
  onAdoptPrompt,
  hasMessages,
}) => {
  const [showConfig, setShowConfig] = useState(false);

  // 提取评测报告中建议的优化提示词片段
  const extractOptimizedPrompt = (text?: string): string | null => {
    if (!text) return null;
    const match = text.match(/```(?:markdown|text|prompt)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const suggestedPrompt = extractOptimizedPrompt(evaluation?.rawReport);

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* 头部条 */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-200">内置评测智能体 (Evaluator Loop)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
              showConfig
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="配置评测智能体的角色、Prompt与参数"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">智能体配置</span>
          </button>
        </div>
      </div>

      {/* 评测智能体配置展开折叠区 */}
      {showConfig && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">评测智能体角色与提示词:</span>
            <div className="flex items-center gap-2">
              <select
                value={evaluatorConfig.model}
                onChange={(e) => onUpdateEvaluatorConfig({ model: e.target.value })}
                className="bg-slate-900 border border-slate-750 text-slate-200 text-[11px] rounded px-2 py-0.5"
              >
                <option value="deepseek-chat">deepseek-chat (评测推荐)</option>
                <option value="deepseek-reasoner">deepseek-reasoner (深度复盘)</option>
              </select>
            </div>
          </div>

          <textarea
            rows={4}
            value={evaluatorConfig.systemPrompt}
            onChange={(e) => onUpdateEvaluatorConfig({ systemPrompt: e.target.value })}
            placeholder="自定义评测智能体的 System Prompt 与评判规则..."
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[11px] text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      )}

      {/* 评测执行按钮与得分徽标区 */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-3">
        {isEvaluating ? (
          <button
            type="button"
            onClick={onAbortEvaluation}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            终止评测
          </button>
        ) : (
          <button
            type="button"
            disabled={!hasMessages}
            onClick={onRunEvaluation}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:shadow-none transition-all"
            title={hasMessages ? '启动 Evaluator Agent 对本次实验进行深度评价' : '请先进行至少一轮对话后再评测'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            🤖 启动智能评估
          </button>
        )}

        {/* 评测得分卡片 */}
        {evaluation && (
          <div className="flex items-center gap-2">
            {evaluation.verdict === 'PASS' && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                通过 (PASS)
              </span>
            )}
            {evaluation.verdict === 'PARTIAL' && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                部分符合 (PARTIAL)
              </span>
            )}
            {evaluation.verdict === 'FAIL' && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                <XCircle className="w-3.5 h-3.5" />
                未达标 (FAIL)
              </span>
            )}

            {evaluation.score !== undefined && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg font-mono">
                <span className="text-[10px] text-slate-400">得分:</span>
                <span className="text-xs font-bold text-blue-400">{evaluation.score} 分</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 评测报告主体 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {evaluation ? (
          <div className="space-y-4">
            {/* 一句话总结 */}
            {evaluation.summary && (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                <span className="font-semibold text-emerald-200">📌 评测小结：</span>
                {evaluation.summary}
              </div>
            )}

            {/* 采纳优化建议按钮 */}
            {suggestedPrompt && onAdoptPrompt && (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <Wand2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>评测专家生成了针对性的优化 System Prompt 草案！</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAdoptPrompt(suggestedPrompt)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-medium flex-shrink-0 transition-all shadow-sm"
                >
                  一键采纳优化
                </button>
              </div>
            )}

            {/* 完整 Markdown 报告 */}
            <div className="prose prose-invert prose-xs max-w-none break-words text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {evaluation.rawReport}
              </ReactMarkdown>
            </div>
          </div>
        ) : isEvaluating ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <h4 className="font-semibold text-xs text-slate-200 mb-1">
              Evaluator Agent 正在分析实验数据...
            </h4>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              智能体正在比对设想行为、系统提示词规则与实际对话轨迹，即将输出打分与改进方案。
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none text-slate-500 text-xs">
            <Award className="w-8 h-8 text-slate-700 mb-2" />
            <p className="mb-1 text-slate-400">暂无评测报告</p>
            <p className="text-[11px] max-w-xs text-slate-600">
              在与被测 Agent 进行对话后，点击上方「🤖 启动智能评估」，项目内置的评测 Agent Loop 将对本次实验给出客观评价和 Prompt 改进建议。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

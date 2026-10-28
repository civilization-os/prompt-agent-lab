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
  Copy,
  Check,
  Stethoscope,
  Target,
  FileCheck,
  ThumbsUp,
  AlertTriangle,
  Code2,
  Layers,
  FileText,
} from 'lucide-react';
import { parseEvaluationReport } from '../utils/evaluatorParser.js';
import type { EvaluationResult, EvaluatorConfig, ExperimentPurpose } from '../types.js';

interface EvaluatorPanelProps {
  evaluation?: EvaluationResult;
  isEvaluating: boolean;
  onRunEvaluation: () => void;
  onAbortEvaluation: () => void;
  evaluatorConfig: EvaluatorConfig;
  onUpdateEvaluatorConfig: (cfg: Partial<EvaluatorConfig>) => void;
  onAdoptPrompt?: (prompt: string) => void;
  hasMessages: boolean;
  purpose: ExperimentPurpose;
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
  purpose,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // 解析并结构化报告内容
  const parsed = parseEvaluationReport(evaluation?.rawReport || '');
  const finalVerdict = evaluation?.verdict || parsed.verdict;
  const finalScore = evaluation?.score || parsed.score;
  const finalSummary = evaluation?.summary || parsed.summary;
  const suggestedPrompt = parsed.suggestedPrompt;

  const handleCopyPrompt = async () => {
    if (!suggestedPrompt) return;
    try {
      await navigator.clipboard.writeText(suggestedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-sans">
      {/* 1. 顶部操作栏 */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-100 tracking-tight">
            内置评测智能体 (Evaluator Loop)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          {evaluation && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('structured')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                  viewMode === 'structured'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="结构化诊断卡片视图"
              >
                <Layers className="w-3 h-3" />
                结构化
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                  viewMode === 'raw'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="原始文本报告"
              >
                <FileText className="w-3 h-3" />
                报告原文
              </button>
            </div>
          )}

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
          </button>
        </div>
      </div>

      {/* 2. 评测配置抽屉（展开可修改 Evaluator 自身 Prompt） */}
      {showConfig && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">评测智能体角色与模型:</span>
            <select
              value={evaluatorConfig.model}
              onChange={(e) => onUpdateEvaluatorConfig({ model: e.target.value })}
              className="bg-slate-900 border border-slate-750 text-slate-200 text-[11px] rounded px-2 py-0.5 font-mono"
            >
              <option value="deepseek-chat">deepseek-chat (评测首选)</option>
              <option value="deepseek-reasoner">deepseek-reasoner (深度复盘)</option>
            </select>
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

      {/* 3. 评测基准显卡（明确告知用户评测智能体依据的目标与标准） */}
      <div className="px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex flex-col gap-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            评测基准：已加载实验目的与标准
          </span>
          <span className="text-[10px] text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            同步上下文
          </span>
        </div>
        <div className="text-slate-400 text-[11px] line-clamp-1">
          <strong className="text-slate-300 font-medium">目的:</strong> {purpose.goal || '未指定实验目的'}
        </div>
      </div>

      {/* 4. 执行按钮与评测状态条 */}
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
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:shadow-none transition-all"
            title={hasMessages ? '启动 Evaluator Agent 对本次实验进行深度评价' : '请先进行至少一轮对话后再评测'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            🤖 启动智能评估
          </button>
        )}

        {/* 裁决与得分徽章 */}
        {evaluation && (
          <div className="flex items-center gap-2">
            {finalVerdict === 'PASS' && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASS (达标)
              </span>
            )}
            {finalVerdict === 'PARTIAL' && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                PARTIAL (部分符合)
              </span>
            )}
            {finalVerdict === 'FAIL' && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                <XCircle className="w-3.5 h-3.5" />
                FAIL (未达标)
              </span>
            )}

            {finalScore !== undefined && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg font-mono">
                <span className="text-[10px] text-slate-400">综合得分:</span>
                <span className="text-xs font-bold text-blue-400">{finalScore} 分</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. 结构化评测卡片展示主体 */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {evaluation ? (
          viewMode === 'structured' ? (
            <div className="space-y-3.5">
              {/* 5.1 一句话总结卡片 */}
              {finalSummary && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed shadow-sm">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    评测核心裁决总结
                  </div>
                  <p className="text-slate-300 font-sans">{finalSummary}</p>
                </div>
              )}

              {/* 5.2 核心根因诊断分析卡片 (用户重点需求) */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-purple-200">
                      🩺 核心根因诊断分析 (Root Cause Diagnosis)
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    深度机理剖析
                  </span>
                </div>

                {parsed.diagnosis && parsed.diagnosis.length > 0 ? (
                  <div className="space-y-2">
                    {parsed.diagnosis.map((diag, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-purple-900/40 text-[11px] leading-relaxed text-slate-200 flex flex-col gap-1"
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 font-bold flex-shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <div className="prose prose-invert prose-xs max-w-none font-sans text-slate-300 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{diag}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs leading-relaxed">
                    未检测到严重行为偏差，模型在当前输入下保持较好稳定性。
                  </p>
                )}
              </div>

              {/* 5.3 System Prompt 针对性优化方案与建议草案 (用户重点需求) */}
              {suggestedPrompt && (
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-blue-950/30 to-slate-950 border border-blue-500/40 shadow-md flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs text-blue-200">
                        🛠️ 建议优化后的 System Prompt 草案
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 border border-slate-700 transition-all"
                        title="复制草案内容"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> 复制
                          </>
                        )}
                      </button>

                      {onAdoptPrompt && (
                        <button
                          type="button"
                          onClick={() => onAdoptPrompt(suggestedPrompt)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                          title="将此优化草案直接填入左侧系统提示词编辑器"
                        >
                          <Sparkles className="w-3 h-3" />
                          一键采纳到左侧
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 提示词代码预览卡片 */}
                  <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 overflow-hidden">
                    <div className="text-[10px] font-mono text-slate-500 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Code2 className="w-3 h-3 text-blue-400" />
                        Prompt Draft (直接可用)
                      </span>
                      <span>{suggestedPrompt.length} 字符</span>
                    </div>
                    <pre className="text-[11px] font-mono text-blue-100 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto selection:bg-blue-600 selection:text-white">
                      {suggestedPrompt}
                    </pre>
                  </div>
                </div>
              )}

              {/* 5.4 实验目的与规则遵从核验卡片 */}
              {(parsed.goalVerification || parsed.adherence) && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs border-b border-slate-800 pb-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    目标与规则遵从核验
                  </div>
                  {parsed.goalVerification && (
                    <div className="text-slate-300 leading-relaxed text-[11px] prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsed.goalVerification}
                      </ReactMarkdown>
                    </div>
                  )}
                  {parsed.adherence && (
                    <div className="text-slate-300 leading-relaxed text-[11px] prose prose-invert prose-xs max-w-none pt-1 border-t border-slate-850">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsed.adherence}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* 5.5 关键亮点与存在缺陷卡片 */}
              {(parsed.strengths.length > 0 || parsed.deficiencies.length > 0) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 亮点 */}
                  <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      做得好的地方
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {parsed.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 缺陷 */}
                  <div className="p-3 rounded-xl bg-rose-950/15 border border-rose-500/20 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      存在的问题与偏离
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {parsed.deficiencies.map((d, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-rose-400">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 5.6 完整原始报告视图（已清洗末尾泄露的 JSON） */
            <div className="prose prose-invert prose-xs max-w-none break-words text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsed.cleanReport}
              </ReactMarkdown>
            </div>
          )
        ) : isEvaluating ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <h4 className="font-semibold text-xs text-slate-100 mb-1">
              Evaluator Agent 正在分析实验数据...
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              智能体正在比对【实验目的】、系统提示词规则与对话执行轨迹，生成结构化诊断与改进方案。
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none text-slate-500 text-xs">
            <Award className="w-8 h-8 text-slate-700 mb-2" />
            <p className="mb-1 text-slate-400 font-medium">暂无评测报告</p>
            <p className="text-[11px] max-w-xs text-slate-500 leading-relaxed">
              在与被测 Agent 进行对话后，点击上方「🤖 启动智能评估」，项目内置的评测 Agent Loop 将对本次实验给出客观评价、根因诊断和优化后的 Prompt 草案。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

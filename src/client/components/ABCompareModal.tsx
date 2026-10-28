import React, { useState, useEffect } from 'react';
import { GitCompare, X, Award, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { ExperimentArchive } from '../types.js';

interface ABCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExperiment: Partial<ExperimentArchive>;
}

export const ABCompareModal: React.FC<ABCompareModalProps> = ({
  isOpen,
  onClose,
  currentExperiment,
}) => {
  const [archives, setArchives] = useState<ExperimentArchive[]>([]);
  const [selectedAId, setSelectedAId] = useState<string>('current');
  const [selectedBId, setSelectedBId] = useState<string>('');
  const [expA, setExpA] = useState<Partial<ExperimentArchive> | null>(null);
  const [expB, setExpB] = useState<Partial<ExperimentArchive> | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/archives')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.list)) {
            setArchives(d.list);
            if (d.list.length > 0 && !selectedBId) {
              setSelectedBId(d.list[0].id);
            }
          }
        });
    }
  }, [isOpen]);

  // 加载 A 的完整数据
  useEffect(() => {
    if (selectedAId === 'current') {
      setExpA(currentExperiment);
    } else {
      fetch(`/api/archives/${selectedAId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setExpA(d.archive);
        });
    }
  }, [selectedAId, currentExperiment]);

  // 加载 B 的完整数据
  useEffect(() => {
    if (!selectedBId) {
      setExpB(null);
      return;
    }
    if (selectedBId === 'current') {
      setExpB(currentExperiment);
    } else {
      fetch(`/api/archives/${selectedBId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setExpB(d.archive);
        });
    }
  }, [selectedBId, currentExperiment]);

  if (!isOpen) return null;

  const renderExperimentColumn = (exp: Partial<ExperimentArchive> | null, label: string) => {
    if (!exp) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-xs">
          请选择一个实验进行对比
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
        {/* 头部元数据与得分 */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-100 text-sm">{exp.name || '当前工作台实验'}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              模型: {exp.modelParams?.model} (T={exp.modelParams?.temperature})
            </div>
          </div>

          {exp.evaluation && (
            <div className="flex items-center gap-2">
              {exp.evaluation.verdict === 'PASS' && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                </span>
              )}
              {exp.evaluation.verdict === 'PARTIAL' && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> PARTIAL
                </span>
              )}
              {exp.evaluation.verdict === 'FAIL' && (
                <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 font-bold">
                  <XCircle className="w-3.5 h-3.5" /> FAIL
                </span>
              )}
              {exp.evaluation.score !== undefined && (
                <span className="text-xs font-mono font-bold text-blue-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  {exp.evaluation.score} 分
                </span>
              )}
            </div>
          )}
        </div>

        {/* 实验目的 */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-300 text-[11px]">🎯 实验目的:</span>
          <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-300 text-[11px]">
            {exp.experimentPurpose?.goal || '未设置'}
          </div>
        </div>

        {/* System Prompt 对比 */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-blue-400 text-[11px]">📝 系统提示词 (System Prompt):</span>
          <pre className="p-3 bg-slate-900/90 rounded border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
            {exp.systemPrompt || '（未设置系统提示词）'}
          </pre>
        </div>

        {/* 对话输出 */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-indigo-400 text-[11px]">💬 交互对话与模型输出:</span>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {exp.messages && exp.messages.length > 0 ? (
              exp.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-[11px] ${
                    m.role === 'user'
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="font-bold uppercase text-[9px] text-slate-400 mb-1">
                    {m.role === 'user' ? '用户输入' : '模型输出'}
                  </div>
                  {m.reasoningContent && (
                    <div className="p-1.5 bg-indigo-950/40 rounded border border-indigo-500/20 text-indigo-300 text-[10px] font-mono mb-1 line-clamp-3">
                      💭 思考: {m.reasoningContent}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4 text-xs">暂无对话记录</div>
            )}
          </div>
        </div>

        {/* 评测小结 */}
        {exp.evaluation?.summary && (
          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded text-emerald-300 text-[11px]">
            <span className="font-bold text-emerald-200">📌 评测总结: </span>
            {exp.evaluation.summary}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-sm text-slate-100">A/B 实验横向对比 (Prompt Comparison)</h2>
            <span className="text-xs text-slate-400">直观比对两组不同 System Prompt 或参数下的输出效果</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 选择条 */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400">实验 A:</span>
            <select
              value={selectedAId}
              onChange={(e) => setSelectedAId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-750 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="current">-- 当前工作台进行中的实验 --</option>
              {archives.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.modelParams?.model})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-400">实验 B:</span>
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-750 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="current">-- 当前工作台进行中的实验 --</option>
              {archives.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.modelParams?.model})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 双栏对比区 */}
        <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden">
          {renderExperimentColumn(expA, 'A')}
          {renderExperimentColumn(expB, 'B')}
        </div>
      </div>
    </div>
  );
};

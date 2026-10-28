import React, { useState } from 'react';
import { Wrench, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCallItem } from '../types.js';

interface ToolCallBlockProps {
  toolCalls: ToolCallItem[];
}

export const ToolCallBlock: React.FC<ToolCallBlockProps> = ({ toolCalls }) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  if (!toolCalls || toolCalls.length === 0) return null;

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="text-[11px] font-semibold text-amber-400/90 flex items-center gap-1.5 px-1">
        <Wrench className="w-3.5 h-3.5" />
        智能体执行循环工具调用轨迹 ({toolCalls.length}):
      </div>

      {toolCalls.map((tc, idx) => {
        const isOpen = openIds[tc.id] ?? true;
        const argStr = typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments, null, 2);
        const resultStr = tc.result !== undefined ? (typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)) : '';

        return (
          <div
            key={tc.id || idx}
            className="rounded-lg border border-amber-500/30 bg-slate-950/80 overflow-hidden text-xs"
          >
            {/* 头部摘要 */}
            <button
              type="button"
              onClick={() => toggleOpen(tc.id)}
              className="w-full px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/15 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300">
                  #{idx + 1} {tc.name}
                </span>

                {/* 状态徽标 */}
                {tc.status === 'executing' && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    <Clock className="w-3 h-3 animate-spin" />
                    正在执行...
                  </span>
                )}
                {tc.status === 'done' && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    已返回
                  </span>
                )}
                {tc.status === 'error' && (
                  <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    执行出错
                  </span>
                )}
                {tc.repairAttempt && tc.repairAttempt > 0 ? (
                  <span className="text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
                    第 {tc.repairAttempt} 次纠错重试
                  </span>
                ) : null}
              </div>

              <div className="text-amber-400">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* 详细展开：入参与返回值 */}
            {isOpen && (
              <div className="p-2.5 flex flex-col gap-2 font-mono text-[11px] bg-slate-950/60 border-t border-amber-500/10">
                {/* 入参 */}
                <div>
                  <div className="text-slate-400 text-[10px] mb-1">输入参数 (Arguments):</div>
                  <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-amber-200 overflow-x-auto whitespace-pre-wrap">
                    {argStr || '(空参数)'}
                  </pre>
                </div>

                {/* 返回结果 */}
                {resultStr && (
                  <div>
                    <div className="text-slate-400 text-[10px] mb-1">工具返回 (Tool Output):</div>
                    <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                      {resultStr}
                    </pre>
                  </div>
                )}

                {/* 错误信息 */}
                {tc.error && (
                  <div className="p-2 bg-rose-950/30 border border-rose-500/30 rounded text-rose-300">
                    {tc.error}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

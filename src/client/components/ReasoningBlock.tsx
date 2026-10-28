import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({ content, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!content) return null;

  return (
    <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-indigo-900/20 hover:bg-indigo-900/30 flex items-center justify-between text-xs text-indigo-300 font-medium select-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 text-indigo-400 ${isStreaming ? 'animate-pulse' : ''}`} />
          <span className="font-semibold">
            {isStreaming ? '正在进行深度思考推理 (Reasoning)...' : '深度思考过程 (Reasoning Content)'}
          </span>
          <span className="text-[10px] text-indigo-400/80 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            {content.length} 字符
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-indigo-400">
          {isStreaming && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-300 font-mono">
              <Sparkles className="w-3 h-3 animate-spin" />
              推演中
            </span>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 text-xs text-indigo-200/90 font-mono leading-relaxed bg-slate-950/50 whitespace-pre-wrap border-t border-indigo-500/10 max-h-80 overflow-y-auto">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-400 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Sparkles,
  Key,
  RotateCcw,
  Archive,
  FolderOpen,
  GitCompare,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Brain,
} from 'lucide-react';
import type { ModelParams } from '../types.js';

interface HeaderProps {
  modelParams: ModelParams;
  onUpdateParams: (params: Partial<ModelParams>) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onClearChat: () => void;
  onOpenArchiveModal: () => void;
  onOpenHistoryDrawer: () => void;
  onOpenCompareModal: () => void;
  isStreaming: boolean;
  messageCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  modelParams,
  onUpdateParams,
  hasApiKey,
  onOpenSettings,
  onClearChat,
  onOpenArchiveModal,
  onOpenHistoryDrawer,
  onOpenCompareModal,
  isStreaming,
  messageCount,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* 左侧：Logo 与标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-slate-100 tracking-tight">Prompt Loop Lab</h1>
            <span className="text-xs font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
              System Prompt 实验室
            </span>
          </div>
          <p className="text-xs text-slate-400">
            基于 DeepSeek & Civilization Agent Loop 的系统提示词评测与行为实验台
          </p>
        </div>
      </div>

      {/* 中间：快速模型切换器 */}
      <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => onUpdateParams({ model: 'deepseek-chat' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            modelParams.model === 'deepseek-chat'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
          title="DeepSeek-V3 快速通用对话模型"
        >
          <Sparkles className="w-3.5 h-3.5" />
          deepseek-chat (V3)
        </button>

        <button
          type="button"
          onClick={() => onUpdateParams({ model: 'deepseek-reasoner' })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            modelParams.model === 'deepseek-reasoner'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
          title="DeepSeek-R1 具备深度思考推理链 (Reasoning Content) 的模型"
        >
          <Brain className="w-3.5 h-3.5 text-indigo-200" />
          deepseek-reasoner (R1 深度思考)
        </button>
      </div>

      {/* 右侧：动作按钮 */}
      <div className="flex items-center gap-2">
        {/* API Key 状态 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
            hasApiKey
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 animate-pulse'
          }`}
          title={hasApiKey ? 'DeepSeek API Key 已配置' : '点击配置 DeepSeek API Key'}
        >
          <Key className="w-3.5 h-3.5" />
          {hasApiKey ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              API 已就绪
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              未填 API Key
            </span>
          )}
        </button>

        {/* 清空会话 */}
        <button
          type="button"
          disabled={isStreaming || messageCount === 0}
          onClick={onClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="清空当前会话消息（保留系统提示词与模型参数）"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          清空会话
        </button>

        {/* 归档本次实验 */}
        <button
          type="button"
          disabled={isStreaming || messageCount === 0}
          onClick={onOpenArchiveModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-200 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          title="将当前 System Prompt、参数、对话及评测结果保存至归档库"
        >
          <Archive className="w-3.5 h-3.5 text-blue-400" />
          归档本次实验
        </button>

        {/* 历史归档库 */}
        <button
          type="button"
          onClick={onOpenHistoryDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all"
          title="查看已归档的实验记录与报告"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          实验归档库
        </button>

        {/* A/B 实验对比 */}
        <button
          type="button"
          onClick={onOpenCompareModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 transition-all"
          title="横向对比两份实验的 System Prompt、模型表现与评测得分"
        >
          <GitCompare className="w-3.5 h-3.5 text-purple-400" />
          A/B 对比
        </button>

        {/* 参数设置 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all"
          title="配置 API 地址、Key 与全局设置"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

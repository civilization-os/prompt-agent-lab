import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Square,
  Bot,
  User,
  Sparkles,
  Zap,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { ReasoningBlock } from './ReasoningBlock.js';
import { ToolCallBlock } from './ToolCallBlock.js';
import type { ChatMessage, ModelParams } from '../types.js';

interface ChatSessionProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onAbort: () => void;
  onClear: () => void;
  modelParams: ModelParams;
  inputValue: string;
  setInputValue: (val: string) => void;
  systemPrompt: string;
}

export const ChatSession: React.FC<ChatSessionProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onAbort,
  onClear,
  modelParams,
  inputValue,
  setInputValue,
  systemPrompt,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
      }
    }
  };

  const handleSend = () => {
    if (!isStreaming && inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
      {/* 状态指示条 */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">智能体执行画布 (Agent Loop Canvas)</span>
          <span className="text-[11px] font-mono text-slate-500">
            {messages.length} 轮对话记录
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 font-mono animate-pulse">
              <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
              Agent Loop 正在流式运转...
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">
              就绪 (Ready)
            </span>
          )}
        </div>
      </div>

      {/* 消息滚动区 */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 shadow-xl">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">
              当前尚未开启测试对话
            </h3>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-4">
              在左侧设置好 System Prompt 与实验目的后，在下方输入测试语句，
              系统将启动 Agent Loop 并展示模型的思维链、工具调用和打字机回复。
            </p>
            <div className="flex flex-col gap-1.5 text-left bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 max-w-sm">
              <span className="font-medium text-slate-300">💡 提示：</span>
              <span>1. 随时修改左侧 System Prompt，下一次提问即刻生效。</span>
              <span>2. 切换为 <code className="text-indigo-400">deepseek-reasoner</code> 可观测深度思考链。</span>
              <span>3. 勾选工具可测试模型的工具调用纪律与自修正能力。</span>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* 智能体头像 */}
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400 mt-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* 消息内容气泡 */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 shadow-sm'
                }`}
              >
                {/* 深度思考流 (Reasoning Content) */}
                {msg.reasoningContent && (
                  <ReasoningBlock
                    content={msg.reasoningContent}
                    isStreaming={isStreaming && msg === messages[messages.length - 1]}
                  />
                )}

                {/* 工具调用轨迹 (Tool Calls) */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <ToolCallBlock toolCalls={msg.toolCalls} />
                )}

                {/* 正文文本渲染 */}
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap font-sans text-xs">{msg.content}</div>
                ) : (
                  <div className="prose prose-invert prose-xs max-w-none break-words font-sans">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      isStreaming && !msg.reasoningContent && (!msg.toolCalls || msg.toolCalls.length === 0) ? (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-spin" />
                          思考回复中...
                        </span>
                      ) : null
                    )}
                  </div>
                )}

                {/* 底部元数据 */}
                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                  }`}
                >
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>

                  {msg.usage && (
                    <span className="font-mono">
                      Tokens: {msg.usage.total_tokens || 0} (Prompt: {msg.usage.prompt_tokens || 0}, Compl: {msg.usage.completion_tokens || 0})
                    </span>
                  )}
                </div>
              </div>

              {/* 用户头像 */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 mt-1 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区 */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/70 backdrop-blur-sm flex flex-col gap-2">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? '模型正在生成中，可点击右侧停止按钮中断...'
                : '输入测试语句（按 Enter 发送，Shift + Enter 换行）...'
            }
            disabled={isStreaming}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none font-sans leading-relaxed disabled:opacity-60"
          />

          <div className="flex items-center gap-1.5 self-end pb-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onAbort}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
                title="中断当前 Agent Loop"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                停止
              </button>
            ) : (
              <button
                type="button"
                disabled={!inputValue.trim()}
                onClick={handleSend}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:shadow-none transition-all"
                title="发送测试消息"
              >
                <Send className="w-3.5 h-3.5" />
                发送
              </button>
            )}
          </div>
        </div>

        {/* 底部小提示 */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>
            当前生效模型: <code className="text-slate-400 font-mono">{modelParams.model}</code> (T={modelParams.temperature})
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              清空画布会话
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

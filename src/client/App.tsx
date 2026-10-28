import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
  FileCode,
  Target,
  Sliders,
  Sparkles,
} from 'lucide-react';

import { Header } from './components/Header.js';
import { SystemPromptEditor } from './components/SystemPromptEditor.js';
import { ExperimentGoalCard } from './components/ExperimentGoalCard.js';
import { ModelParamsConfig } from './components/ModelParamsConfig.js';
import { ChatSession } from './components/ChatSession.js';
import { EvaluatorPanel } from './components/EvaluatorPanel.js';
import { ArchiveDrawer } from './components/ArchiveDrawer.js';
import { ABCompareModal } from './components/ABCompareModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { SaveArchiveModal } from './components/SaveArchiveModal.js';

import { PRESETS } from './presets.js';
import type {
  ChatMessage,
  ModelParams,
  ExperimentPurpose,
  EvaluationResult,
  EvaluatorConfig,
  ExperimentArchive,
} from './types.js';

export const App: React.FC = () => {
  // 1. 实验核心状态
  const [systemPrompt, setSystemPrompt] = useState<string>(PRESETS[0].systemPrompt);
  const [purpose, setPurpose] = useState<ExperimentPurpose>(PRESETS[0].purpose);
  const [modelParams, setModelParams] = useState<ModelParams>({
    model: 'deepseek-chat',
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 4096,
    frequency_penalty: 0,
    presence_penalty: 0,
    response_format: 'text',
    stop: '',
    enabledTools: ['calculator', 'web_search', 'get_current_time', 'scratchpad'],
    maxIterations: 10,
  });

  // 2. 会话状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 3. 评测智能体状态
  const [evaluation, setEvaluation] = useState<EvaluationResult | undefined>(undefined);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const evalAbortControllerRef = useRef<AbortController | null>(null);
  const [evaluatorConfig, setEvaluatorConfig] = useState<EvaluatorConfig>({
    systemPrompt: '',
    model: 'deepseek-chat',
    temperature: 0.3,
  });

  // 4. 左侧配置栏 Tab: 'prompt' | 'purpose' | 'params'
  const [leftTab, setLeftTab] = useState<'prompt' | 'purpose' | 'params'>('prompt');

  // 5. 模态框显隐控制
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // 初始化加载服务器配置
  const checkSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setHasApiKey(data.settings?.hasApiKey || false);
        if (data.defaultEvaluatorPrompt && !evaluatorConfig.systemPrompt) {
          setEvaluatorConfig((prev) => ({
            ...prev,
            systemPrompt: data.defaultEvaluatorPrompt,
          }));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkSettings();
  }, []);

  // 更新模型参数
  const handleUpdateParams = (newParams: Partial<ModelParams>) => {
    setModelParams((prev) => ({ ...prev, ...newParams }));
  };

  // 应用模版预设
  const handleApplyPreset = (prompt: string, purp: ExperimentPurpose, params?: Partial<ModelParams>) => {
    setSystemPrompt(prompt);
    setPurpose(purp);
    if (params) {
      setModelParams((prev) => ({ ...prev, ...params }));
    }
  };

  // 清空画布对话
  const handleClearChat = () => {
    if (isStreaming) {
      handleAbort();
    }
    setMessages([]);
    setEvaluation(undefined);
  };

  // 中断当前 Agent Loop
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // 中断评测智能体
  const handleAbortEvaluation = () => {
    if (evalAbortControllerRef.current) {
      evalAbortControllerRef.current.abort();
      evalAbortControllerRef.current = null;
    }
    setIsEvaluating(false);
  };

  // 发送消息并执行 Agent Loop 流式交互
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    const assistantMsgId = nanoid();
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      toolCalls: [],
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg, initialAssistantMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
            reasoningContent: m.reasoningContent,
            toolCalls: m.toolCalls,
          })),
          modelParams,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`服务端响应异常 [${response.status}]`);
      }

      if (!response.body) {
        throw new Error('未接收到可读流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));

              setMessages((prevMsgs) =>
                prevMsgs.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;

                  if (event.type === 'text-delta') {
                    return {
                      ...msg,
                      content: msg.content + event.delta,
                    };
                  }
                  if (event.type === 'reasoning-delta') {
                    return {
                      ...msg,
                      reasoningContent: (msg.reasoningContent || '') + event.delta,
                    };
                  }
                  if (event.type === 'tool-call-start') {
                    const existing = msg.toolCalls || [];
                    if (existing.some((t) => t.id === event.toolCall.id)) return msg;
                    return {
                      ...msg,
                      toolCalls: [
                        ...existing,
                        {
                          id: event.toolCall.id,
                          name: event.toolCall.name,
                          arguments: '',
                          status: 'calling',
                        },
                      ],
                    };
                  }
                  if (event.type === 'tool-call-delta') {
                    return {
                      ...msg,
                      toolCalls: (msg.toolCalls || []).map((t) =>
                        t.id === event.toolCallId
                          ? { ...t, arguments: (typeof t.arguments === 'string' ? t.arguments : '') + event.delta }
                          : t
                      ),
                    };
                  }
                  if (event.type === 'tool-executing') {
                    return {
                      ...msg,
                      toolCalls: (msg.toolCalls || []).map((t) =>
                        t.id === event.toolCall.id ? { ...t, status: 'executing' } : t
                      ),
                    };
                  }
                  if (event.type === 'tool-result') {
                    return {
                      ...msg,
                      toolCalls: (msg.toolCalls || []).map((t) =>
                        t.id === event.toolCallId ? { ...t, status: 'done', result: event.result } : t
                      ),
                    };
                  }
                  if (event.type === 'tool-repair-attempt') {
                    return {
                      ...msg,
                      toolCalls: (msg.toolCalls || []).map((t) =>
                        t.id === event.toolCallId
                          ? { ...t, status: 'calling', repairAttempt: event.attempt, error: event.error }
                          : t
                      ),
                    };
                  }
                  if (event.type === 'completed') {
                    return {
                      ...msg,
                      usage: event.usage || msg.usage,
                    };
                  }
                  if (event.type === 'error') {
                    return {
                      ...msg,
                      content: msg.content + `\n\n> ⚠️ **执行错误**: ${event.error?.message || '未知错误'}`,
                    };
                  }

                  return msg;
                })
              );
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated.find((m) => m.id === assistantMsgId);
          if (last) {
            last.content += `\n\n> ⚠️ **请求失败**: ${err.message || '网络连接异常'}`;
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // 启动内置 Evaluator Agent Loop 进行智能评测
  const handleRunEvaluation = async () => {
    if (messages.length === 0 || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluation({
      verdict: '',
      score: 0,
      summary: '',
      rawReport: '',
      evaluatedAt: new Date().toISOString(),
    });

    const controller = new AbortController();
    evalAbortControllerRef.current = controller;

    try {
      const response = await fetch('/api/evaluate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          experimentPurpose: purpose,
          modelParams,
          conversation: messages,
          evaluatorConfig,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`评测服务响应异常 [${response.status}]`);
      }

      if (!response.body) throw new Error('未接收到可读流');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullReport = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));
              if (event.type === 'text-delta') {
                fullReport += event.delta;
                setEvaluation((prev) => ({
                  verdict: prev?.verdict || '',
                  score: prev?.score || 0,
                  summary: prev?.summary || '',
                  rawReport: fullReport,
                  evaluatedAt: new Date().toISOString(),
                }));
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // 解析元数据 json:evaluation_meta
      const metaMatch = fullReport.match(/```json:evaluation_meta\s*([\s\S]*?)```/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          setEvaluation((prev) => ({
            verdict: meta.verdict || 'PASS',
            score: meta.score ?? 85,
            summary: meta.summary || '',
            rawReport: fullReport,
            evaluatedAt: new Date().toISOString(),
          }));
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`评测失败: ${err.message}`);
      }
    } finally {
      setIsEvaluating(false);
      evalAbortControllerRef.current = null;
    }
  };

  // 采纳评测报告中的优化提示词
  const handleAdoptPrompt = (prompt: string) => {
    setSystemPrompt(prompt);
    setLeftTab('prompt');
  };

  // 确认归档保存
  const handleConfirmArchive = async (archiveName: string) => {
    const payload = {
      name: archiveName,
      systemPrompt,
      experimentPurpose: purpose,
      modelParams,
      messages,
      evaluation,
    };

    const res = await fetch('/api/archives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || '保存失败');
    }
  };

  // 恢复归档到当前工作台
  const handleRestoreArchive = (arch: ExperimentArchive) => {
    setSystemPrompt(arch.systemPrompt || '');
    if (arch.experimentPurpose) {
      setPurpose(arch.experimentPurpose);
    }
    if (arch.modelParams) {
      setModelParams(arch.modelParams);
    }
    if (arch.messages) {
      setMessages(arch.messages);
    }
    if (arch.evaluation) {
      setEvaluation(arch.evaluation);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. 顶部全局导航栏 */}
      <Header
        modelParams={modelParams}
        onUpdateParams={handleUpdateParams}
        hasApiKey={hasApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClearChat={handleClearChat}
        onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryOpen(true)}
        onOpenCompareModal={() => setIsCompareOpen(true)}
        isStreaming={isStreaming}
        messageCount={messages.length}
      />

      {/* 2. 主工作区布局 */}
      <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* 左侧栏 (4/12 宽度): 实验配置、提示词编辑与参数控制 */}
        <section className="col-span-4 flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* 左栏选项卡切换 */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/90 p-1 gap-1">
            <button
              type="button"
              onClick={() => setLeftTab('prompt')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                leftTab === 'prompt'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              系统提示词
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('purpose')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                leftTab === 'purpose'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              实验目的
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('params')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                leftTab === 'params'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              模型参数
            </button>
          </div>

          {/* 选项卡内容区 */}
          <div className="flex-1 overflow-y-auto p-2">
            {leftTab === 'prompt' && (
              <SystemPromptEditor
                systemPrompt={systemPrompt}
                onChange={setSystemPrompt}
                onApplyPreset={handleApplyPreset}
              />
            )}

            {leftTab === 'purpose' && (
              <ExperimentGoalCard
                purpose={purpose}
                onChange={setPurpose}
                onSelectTestCase={(tc) => setInputValue(tc)}
              />
            )}

            {leftTab === 'params' && (
              <ModelParamsConfig
                params={modelParams}
                onChange={handleUpdateParams}
              />
            )}
          </div>
        </section>

        {/* 中间栏 (5/12 宽度): Agent Loop 交互对话与执行画布 */}
        <section className="col-span-5 flex flex-col h-full overflow-hidden">
          <ChatSession
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onAbort={handleAbort}
            onClear={handleClearChat}
            modelParams={modelParams}
            inputValue={inputValue}
            setInputValue={setInputValue}
            systemPrompt={systemPrompt}
          />
        </section>

        {/* 右侧栏 (3/12 宽度): 内置 Evaluator Agent Loop 智能评测面板 */}
        <section className="col-span-3 flex flex-col h-full overflow-hidden">
          <EvaluatorPanel
            evaluation={evaluation}
            isEvaluating={isEvaluating}
            onRunEvaluation={handleRunEvaluation}
            onAbortEvaluation={handleAbortEvaluation}
            evaluatorConfig={evaluatorConfig}
            onUpdateEvaluatorConfig={(cfg) => setEvaluatorConfig((prev) => ({ ...prev, ...cfg }))}
            onAdoptPrompt={handleAdoptPrompt}
            hasMessages={messages.length > 0}
            purpose={purpose}
          />
        </section>
      </main>

      {/* 3. 模态框与侧边抽屉 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={checkSettings}
      />

      <SaveArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        defaultName={purpose.title || `实验_${new Date().toLocaleDateString('zh-CN')}`}
        onConfirm={handleConfirmArchive}
      />

      <ArchiveDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestoreArchive}
      />

      <ABCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentExperiment={{
          name: purpose.title || '当前工作台实验',
          systemPrompt,
          experimentPurpose: purpose,
          modelParams,
          messages,
          evaluation,
        }}
      />
    </div>
  );
};

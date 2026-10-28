import React from 'react';
import { Sliders, Wrench, ShieldAlert } from 'lucide-react';
import type { ModelParams } from '../types.js';

interface ModelParamsConfigProps {
  params: ModelParams;
  onChange: (params: Partial<ModelParams>) => void;
}

export const ModelParamsConfig: React.FC<ModelParamsConfigProps> = ({ params, onChange }) => {
  const toggleTool = (toolName: string) => {
    const current = new Set(params.enabledTools || []);
    if (current.has(toolName)) {
      current.delete(toolName);
    } else {
      current.add(toolName);
    }
    onChange({ enabledTools: Array.from(current) });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* 标题 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs text-slate-200">DeepSeek 模型与执行参数</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">随时修改生效</span>
      </div>

      {/* 模型选择 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-slate-300">模型选择 (Model):</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ model: 'deepseek-chat' })}
            className={`p-2 rounded-lg border text-left transition-all ${
              params.model === 'deepseek-chat'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold">deepseek-chat</div>
            <div className="text-[10px] text-slate-400 mt-0.5">V3 旗舰通用对话模型</div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ model: 'deepseek-reasoner' })}
            className={`p-2 rounded-lg border text-left transition-all ${
              params.model === 'deepseek-reasoner'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center justify-between">
              deepseek-reasoner
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded">R1 推理</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">具备深度思考 (Reasoning) 链</div>
          </button>
        </div>
      </div>

      {/* 温度 Temperature */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-slate-300">采样温度 (Temperature):</span>
          <span className="font-mono text-blue-400 font-bold">{params.temperature.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="2.0"
          step="0.05"
          value={params.temperature}
          onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[9px] text-slate-500">
          <span onClick={() => onChange({ temperature: 0.0 })} className="cursor-pointer hover:text-slate-300">
            0.0 严谨算术/代码
          </span>
          <span onClick={() => onChange({ temperature: 0.6 })} className="cursor-pointer hover:text-slate-300">
            0.6 R1建议
          </span>
          <span onClick={() => onChange({ temperature: 1.0 })} className="cursor-pointer hover:text-slate-300">
            1.0 标准默认
          </span>
          <span onClick={() => onChange({ temperature: 1.3 })} className="cursor-pointer hover:text-slate-300">
            1.3 创意发散
          </span>
        </div>
      </div>

      {/* 核采样 Top_P 与 最大输出 Tokens */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Top_P:</span>
            <span className="font-mono text-slate-400">{params.top_p.toFixed(2)}</span>
          </div>
          <input
            type="number"
            min="0.1"
            max="1.0"
            step="0.05"
            value={params.top_p}
            onChange={(e) => onChange({ top_p: parseFloat(e.target.value) || 1.0 })}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Max Tokens:</span>
            <span className="font-mono text-slate-400">{params.max_tokens}</span>
          </div>
          <input
            type="number"
            min="64"
            max="8192"
            step="128"
            value={params.max_tokens}
            onChange={(e) => onChange({ max_tokens: parseInt(e.target.value) || 4096 })}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          />
        </div>
      </div>

      {/* 惩罚项 Frequency Penalty & Presence Penalty */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium" title="频率惩罚：抑制词汇重复率">
              Freq Penalty:
            </span>
            <span className="font-mono text-slate-400">{params.frequency_penalty}</span>
          </div>
          <input
            type="number"
            min="-2.0"
            max="2.0"
            step="0.1"
            value={params.frequency_penalty}
            onChange={(e) => onChange({ frequency_penalty: parseFloat(e.target.value) || 0 })}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium" title="存在惩罚：鼓励引入全新话题">
              Pres Penalty:
            </span>
            <span className="font-mono text-slate-400">{params.presence_penalty}</span>
          </div>
          <input
            type="number"
            min="-2.0"
            max="2.0"
            step="0.1"
            value={params.presence_penalty}
            onChange={(e) => onChange({ presence_penalty: parseFloat(e.target.value) || 0 })}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
          />
        </div>
      </div>

      {/* 响应格式 Response Format */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300 font-medium">强制响应格式 (Response Format):</span>
        <select
          value={params.response_format}
          onChange={(e) => onChange({ response_format: e.target.value as 'text' | 'json_object' })}
          className="bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
        >
          <option value="text">text (默认文本/Markdown)</option>
          <option value="json_object">json_object (严格输出 JSON)</option>
        </select>
      </div>

      {/* Agent Loop 控制与工具配置 */}
      <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            Agent Loop 工具集成与熔断
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldAlert className="w-3 h-3 text-slate-500" />
            <span className="text-slate-400">最大轮数:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={params.maxIterations}
              onChange={(e) => onChange({ maxIterations: parseInt(e.target.value) || 10 })}
              className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono text-center"
              title="Agent Loop 熔断阈值，防止模型死循环反复调用工具"
            />
          </div>
        </div>

        {/* 可用工具复选框 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { id: 'calculator', name: 'calculator', desc: '精准算术计算器' },
            { id: 'web_search', name: 'web_search', desc: '知识检索与搜索' },
            { id: 'get_current_time', name: 'get_current_time', desc: '系统实时时间' },
            { id: 'scratchpad', name: 'scratchpad', desc: '暂存备忘本' },
          ].map((t) => {
            const isChecked = (params.enabledTools || []).includes(t.id);
            return (
              <label
                key={t.id}
                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleTool(t.id)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <div className="flex flex-col">
                  <span className="font-mono font-medium text-[11px]">{t.name}</span>
                  <span className="text-[10px] text-slate-500">{t.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

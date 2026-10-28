import React from 'react';
import { Target, CheckCircle, Lightbulb, PlayCircle } from 'lucide-react';
import type { ExperimentPurpose } from '../types.js';

interface ExperimentGoalCardProps {
  purpose: ExperimentPurpose;
  onChange: (purpose: ExperimentPurpose) => void;
  onSelectTestCase: (text: string) => void;
}

export const ExperimentGoalCard: React.FC<ExperimentGoalCardProps> = ({
  purpose,
  onChange,
  onSelectTestCase,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* 头部标题与实验名称 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-200">实验目的与设想行为</span>
        </div>
        <input
          type="text"
          value={purpose.title}
          onChange={(e) => onChange({ ...purpose, title: e.target.value })}
          placeholder="给本次实验起个名字..."
          className="bg-slate-950 border border-slate-750 text-xs text-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 text-right font-medium"
        />
      </div>

      {/* 设想行为目的 */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          实验目的 (想测试/验证模型达到什么行为):
        </label>
        <textarea
          rows={2}
          value={purpose.goal}
          onChange={(e) => onChange({ ...purpose, goal: e.target.value })}
          placeholder="例如：验证在用户只说一句模糊需求时，模型是否会先主动反问2-3个关键问题，而不是直接盲目给出配置方案..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-none"
        />
      </div>

      {/* 预期评判标准 */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          预期评判标准 (内置 Evaluator 判定 PASS 的依据):
        </label>
        <textarea
          rows={2}
          value={purpose.expectedBehavior}
          onChange={(e) => onChange({ ...purpose, expectedBehavior: e.target.value })}
          placeholder="例如：1. 严禁直接给出答案；2. 必须包含关于使用场景的反问；3. 语气谦逊有礼貌..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-none"
        />
      </div>

      {/* 快捷测试用例推荐 */}
      {purpose.testCases && purpose.testCases.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <PlayCircle className="w-3 h-3 text-blue-400" />
            点击快捷填入测试输入:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {purpose.testCases.map((tc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTestCase(tc)}
                className="text-left text-xs bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all line-clamp-1 max-w-full"
                title={`填入: "${tc}"`}
              >
                &ldquo;{tc}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

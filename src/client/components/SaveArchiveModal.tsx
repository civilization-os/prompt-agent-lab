import React, { useState } from 'react';
import { Archive, X, Check } from 'lucide-react';

interface SaveArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  onConfirm: (name: string) => Promise<void>;
}

export const SaveArchiveModal: React.FC<SaveArchiveModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  onConfirm,
}) => {
  const [name, setName] = useState(defaultName || `实验_${new Date().toLocaleDateString('zh-CN')}`);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onConfirm(name.trim() || defaultName);
      onClose();
    } catch (err: any) {
      alert(`归档失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-100">归档本次实验记录</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3 text-xs">
          <label className="font-semibold text-slate-300">请输入实验归档名称:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：苏格拉底追问在笔记本推荐场景下的行为测试"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            将保存：当前被测试的 System Prompt、全部模型参数、实验设想目的、完整对话与执行轨迹，以及 Evaluator Agent 的打分与优化建议。
          </p>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? '正在归档...' : '确认归档保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

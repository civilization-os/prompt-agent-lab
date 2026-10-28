import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  X,
  RotateCcw,
  Trash2,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { ExperimentArchive } from '../types.js';

interface ArchiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (archive: ExperimentArchive) => void;
}

export const ArchiveDrawer: React.FC<ArchiveDrawerProps> = ({
  isOpen,
  onClose,
  onRestore,
}) => {
  const [archives, setArchives] = useState<ExperimentArchive[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ExperimentArchive | null>(null);

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/archives');
      const data = await res.json();
      if (data.success && Array.isArray(data.list)) {
        setArchives(data.list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArchives();
    }
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这条归档实验吗？')) return;
    try {
      await fetch(`/api/archives/${id}`, { method: 'DELETE' });
      setArchives((prev) => prev.filter((a) => a.id !== id));
      if (selectedArchive?.id === id) {
        setSelectedArchive(null);
      }
    } catch {
      // ignore
    }
  };

  const handleSelect = async (id: string) => {
    try {
      const res = await fetch(`/api/archives/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedArchive(data.archive);
      }
    } catch {
      // ignore
    }
  };

  const handleExportMarkdown = (arch: ExperimentArchive) => {
    const md = `# 实验报告归档: ${arch.name}
- 归档时间: ${new Date(arch.createdAt).toLocaleString('zh-CN')}
- 实验 ID: ${arch.id}
- 模型型号: ${arch.modelParams.model} (温度: ${arch.modelParams.temperature})

## 1. 实验目的与预期
- **实验目标**: ${arch.experimentPurpose.goal || '未填写'}
- **预期行为**: ${arch.experimentPurpose.expectedBehavior || '未填写'}

## 2. 被测系统提示词 (System Prompt)
\`\`\`
${arch.systemPrompt}
\`\`\`

## 3. 对话与执行记录
${arch.messages
  .map(
    (m, idx) =>
      `### [${idx + 1}] ${m.role.toUpperCase()}:\n${m.reasoningContent ? `> **思考推演**:\n${m.reasoningContent}\n\n` : ''}${m.content}`
  )
  .join('\n\n')}

## 4. 智能体评测结果
- **评测结论**: ${arch.evaluation?.verdict || '未评测'}
- **综合得分**: ${arch.evaluation?.score ?? 'N/A'} 分
- **评测小结**: ${arch.evaluation?.summary || '无'}

### 评测详细报告
${arch.evaluation?.rawReport || '无详细报告'}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${arch.name || 'experiment'}_${arch.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filtered = archives.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.experimentPurpose?.goal?.toLowerCase().includes(search.toLowerCase()) ||
      a.systemPrompt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* 抽屉头部 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100">实验归档库 (Experiment Archives)</h2>
            <span className="text-xs text-slate-500 font-mono">共 {archives.length} 条记录</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索实验名称、目的或系统提示词..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 列表区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">正在加载归档列表...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">暂无符合条件的实验归档</div>
          ) : (
            filtered.map((arch) => (
              <div
                key={arch.id}
                onClick={() => handleSelect(arch.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedArchive?.id === arch.id
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-xs text-slate-200 line-clamp-1">{arch.name}</div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* 得分与裁决 */}
                    {arch.evaluation?.verdict === 'PASS' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> PASS ({arch.evaluation.score}分)
                      </span>
                    )}
                    {arch.evaluation?.verdict === 'PARTIAL' && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                        <AlertCircle className="w-3 h-3" /> PARTIAL ({arch.evaluation.score}分)
                      </span>
                    )}
                    {arch.evaluation?.verdict === 'FAIL' && (
                      <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-medium">
                        <XCircle className="w-3 h-3" /> FAIL ({arch.evaluation.score}分)
                      </span>
                    )}
                  </div>
                </div>

                {/* 实验目的 */}
                {arch.experimentPurpose?.goal && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                    🎯 目的: {arch.experimentPurpose.goal}
                  </p>
                )}

                {/* 底部元数据与操作 */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(arch.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {arch.modelParams?.model}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 导出 Markdown */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportMarkdown(arch as ExperimentArchive);
                      }}
                      className="p-1 hover:text-blue-400 hover:bg-slate-850 rounded"
                      title="导出 Markdown 报告"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* 恢复到工作区 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(arch as ExperimentArchive);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded transition-colors text-[10px]"
                      title="恢复提示词、参数、目的与会话到当前工作台"
                    >
                      <RotateCcw className="w-3 h-3" />
                      恢复
                    </button>

                    {/* 删除 */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(arch.id, e)}
                      className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                      title="删除此实验"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

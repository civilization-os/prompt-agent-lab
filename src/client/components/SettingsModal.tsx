import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.deepseek.com');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.settings) {
            setBaseURL(d.settings.deepseekBaseUrl || 'https://api.deepseek.com');
            if (d.settings.deepseekApiKey) {
              setApiKey(d.settings.deepseekApiKey);
            }
          }
        });
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deepseekApiKey: apiKey.trim(),
          deepseekBaseUrl: baseURL.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSettingsSaved();
        onClose();
      }
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const testRes = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      });

      if (testRes.ok) {
        setTestResult({ success: true, message: '🎉 API 连接成功！DeepSeek 服务正常响应。' });
      } else {
        const text = await testRes.text();
        let errMsg = text;
        try {
          const j = JSON.parse(text);
          errMsg = j.error?.message || text;
        } catch {}
        setTestResult({ success: false, message: `连接失败 [${testRes.status}]: ${errMsg}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `网络请求失败: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-100">DeepSeek 模型与 API 设置</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200">DeepSeek API Key:</label>
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                获取 DeepSeek API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-16 text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 text-[11px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-850"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              密钥仅安全保存在本地服务端，用于调用官方 DeepSeek-V3 与 DeepSeek-R1 模型。
            </span>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-200">API 服务基础地址 (Base URL):</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.deepseek.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-500">
              默认为官方地址 <code className="text-slate-400">https://api.deepseek.com</code>，兼容自建或反向代理。
            </span>
          </div>

          {/* 测试连接结果 */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            disabled={!apiKey.trim() || loading}
            onClick={handleTestConnection}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium disabled:opacity-40 transition-all"
          >
            {loading ? '测试中...' : '测试 API 连通性'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

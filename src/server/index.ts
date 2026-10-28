import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AgentRunner, type RunAgentRequest } from './agent.js';
import { EvaluatorAgent, type EvaluatorRequest, DEFAULT_EVALUATOR_SYSTEM_PROMPT } from './evaluator.js';
import { StorageService } from './storage.js';
import { ALL_BUILTIN_TOOLS } from './tools.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * 1. 智能体主循环流式接口 (Agent Loop Stream)
 */
app.post('/api/chat/stream', async (req, res) => {
  const runReq = req.body as RunAgentRequest;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    // 若请求体未携带 API Key，则尝试从服务端存储中读取
    if (!runReq.credentials?.apiKey) {
      const settings = await StorageService.getSettings();
      if (settings.deepseekApiKey) {
        runReq.credentials = {
          ...runReq.credentials,
          apiKey: settings.deepseekApiKey,
          baseURL: runReq.credentials?.baseURL || settings.deepseekBaseUrl,
        };
      }
    }

    const stream = AgentRunner.run(runReq, controller.signal);

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    const errPayload = {
      type: 'error',
      error: {
        message: error.message || '执行过程出现异常',
        stack: error.stack,
      },
    };
    try {
      res.write(`data: ${JSON.stringify(errPayload)}\n\n`);
      res.end();
    } catch {}
  }
});

/**
 * 2. 评测智能体流式接口 (Evaluator Agent Loop Stream)
 */
app.post('/api/evaluate/stream', async (req, res) => {
  const evalReq = req.body as EvaluatorRequest;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    if (!evalReq.evaluatorConfig?.apiKey) {
      const settings = await StorageService.getSettings();
      if (settings.deepseekApiKey) {
        evalReq.evaluatorConfig = {
          ...evalReq.evaluatorConfig,
          apiKey: settings.deepseekApiKey,
          baseURL: evalReq.evaluatorConfig?.baseURL || settings.deepseekBaseUrl,
        };
      }
    }

    const stream = EvaluatorAgent.runEvaluationStream(evalReq, controller.signal);

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    const errPayload = {
      type: 'error',
      error: {
        message: error.message || '评测过程出现异常',
      },
    };
    try {
      res.write(`data: ${JSON.stringify(errPayload)}\n\n`);
      res.end();
    } catch {}
  }
});

/**
 * 3. 获取所有可用工具列表
 */
app.get('/api/tools', (_req, res) => {
  const tools = ALL_BUILTIN_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.definition.parameters,
  }));
  res.json({ success: true, tools });
});

/**
 * 4. 实验归档管理接口
 */
app.get('/api/archives', async (_req, res) => {
  try {
    const list = await StorageService.listArchives();
    res.json({ success: true, list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/archives', async (req, res) => {
  try {
    const archive = await StorageService.saveArchive(req.body);
    res.json({ success: true, archive });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/archives/:id', async (req, res) => {
  try {
    const archive = await StorageService.getArchive(req.params.id);
    if (!archive) {
      res.status(404).json({ success: false, error: '未找到该归档实验' });
      return;
    }
    res.json({ success: true, archive });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/archives/:id', async (req, res) => {
  try {
    const ok = await StorageService.deleteArchive(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. 全局应用配置接口
 */
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await StorageService.getSettings();
    // 隐藏大部分 key 字符以保安全
    const maskedKey = settings.deepseekApiKey
      ? `${settings.deepseekApiKey.slice(0, 4)}...${settings.deepseekApiKey.slice(-4)}`
      : '';
    res.json({
      success: true,
      settings: {
        ...settings,
        hasApiKey: Boolean(settings.deepseekApiKey),
        maskedKey,
      },
      defaultEvaluatorPrompt: DEFAULT_EVALUATOR_SYSTEM_PROMPT,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const current = await StorageService.getSettings();
    const updated = {
      ...current,
      ...req.body,
    };
    // 如果没有传入新的 key，则保留原有的 key
    if (req.body.deepseekApiKey === undefined) {
      updated.deepseekApiKey = current.deepseekApiKey;
    }
    await StorageService.saveSettings(updated);
    res.json({ success: true, message: '配置已更新' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Prompt Loop Lab Server] running at http://127.0.0.1:${PORT}`);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { LoopMessage } from '../agent-loop/types/model.js';

export interface ExperimentArchive {
  id: string;
  name: string;
  createdAt: string;
  systemPrompt: string;
  experimentPurpose: {
    goal: string;
    expectedBehavior: string;
  };
  modelParams: {
    model: string;
    temperature: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    response_format?: { type: 'text' | 'json_object' };
    enabledTools?: string[];
    maxIterations?: number;
    [key: string]: unknown;
  };
  messages: LoopMessage[];
  evaluation?: {
    verdict?: 'PASS' | 'PARTIAL' | 'FAIL' | string;
    score?: number;
    summary?: string;
    rawReport?: string;
    evaluatedAt?: string;
  };
  stats?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    iterations?: number;
  };
}

export interface AppSettings {
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ARCHIVES_DIR = path.join(DATA_DIR, 'archives');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

async function ensureDirs() {
  await fs.mkdir(ARCHIVES_DIR, { recursive: true });
}

export class StorageService {
  /**
   * 保存或更新实验归档
   */
  public static async saveArchive(data: Omit<ExperimentArchive, 'id' | 'createdAt'> & { id?: string }): Promise<ExperimentArchive> {
    await ensureDirs();
    const id = data.id || `exp_${Date.now()}_${nanoid(6)}`;
    const createdAt = new Date().toISOString();

    const archive: ExperimentArchive = {
      ...data,
      id,
      name: data.name?.trim() || `实验_${new Date().toLocaleString('zh-CN')}`,
      createdAt,
    };

    const filePath = path.join(ARCHIVES_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(archive, null, 2), 'utf-8');
    return archive;
  }

  /**
   * 列出所有归档列表（精简元数据，按时间倒序）
   */
  public static async listArchives(): Promise<Array<Partial<ExperimentArchive> & { id: string; name: string; createdAt: string }>> {
    await ensureDirs();
    try {
      const files = await fs.readdir(ARCHIVES_DIR);
      const list: Array<Partial<ExperimentArchive> & { id: string; name: string; createdAt: string }> = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await fs.readFile(path.join(ARCHIVES_DIR, file), 'utf-8');
          const item = JSON.parse(content) as ExperimentArchive;
          list.push({
            id: item.id,
            name: item.name,
            createdAt: item.createdAt,
            systemPrompt: item.systemPrompt ? item.systemPrompt.slice(0, 100) : '',
            experimentPurpose: item.experimentPurpose,
            modelParams: item.modelParams,
            evaluation: item.evaluation,
            stats: item.stats,
          });
        } catch {
          // ignore broken file
        }
      }

      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  /**
   * 获取指定归档详情
   */
  public static async getArchive(id: string): Promise<ExperimentArchive | null> {
    await ensureDirs();
    const filePath = path.join(ARCHIVES_DIR, `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ExperimentArchive;
    } catch {
      return null;
    }
  }

  /**
   * 删除归档
   */
  public static async deleteArchive(id: string): Promise<boolean> {
    await ensureDirs();
    const filePath = path.join(ARCHIVES_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 读取应用配置
   */
  public static async getSettings(): Promise<AppSettings> {
    await ensureDirs();
    try {
      const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
        deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        defaultModel: 'deepseek-chat',
        defaultTemperature: 1.0,
      };
    }
  }

  /**
   * 保存应用配置
   */
  public static async saveSettings(settings: AppSettings): Promise<AppSettings> {
    await ensureDirs();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return settings;
  }
}

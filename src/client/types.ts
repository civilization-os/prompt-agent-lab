export interface ModelParams {
  model: 'deepseek-chat' | 'deepseek-reasoner' | string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  frequency_penalty: number;
  presence_penalty: number;
  response_format: 'text' | 'json_object';
  stop: string;
  enabledTools: string[];
  maxIterations: number;
}

export interface ToolCallItem {
  id: string;
  name: string;
  arguments: string | Record<string, unknown>;
  result?: unknown;
  status: 'calling' | 'executing' | 'done' | 'error';
  error?: string;
  repairAttempt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  reasoningContent?: string;
  toolCalls?: ToolCallItem[];
  timestamp: number;
  iteration?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface ExperimentPurpose {
  title: string;
  goal: string;
  expectedBehavior: string;
  testCases: string[];
}

export interface EvaluationResult {
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | string;
  score: number;
  summary: string;
  rawReport: string;
  evaluatedAt: string;
}

export interface EvaluatorConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
}

export interface ExperimentArchive {
  id: string;
  name: string;
  createdAt: string;
  systemPrompt: string;
  experimentPurpose: ExperimentPurpose;
  modelParams: ModelParams;
  messages: ChatMessage[];
  evaluation?: EvaluationResult;
  stats?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    iterations?: number;
  };
}

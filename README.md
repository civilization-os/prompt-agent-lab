# Prompt Loop Lab (系统提示词实验室)

> 一个专为大模型 Prompt 工程师与智能体开发者打造的 **System Prompt 行为实验与评测工作台**。  
> 核心执行循环（Agent Loop）参考并融合自 [`D:\project\aibase\agent_loop`](file:///D:/project/aibase/agent_loop)，原生支持 **DeepSeek** 全系模型（含 `deepseek-chat` 与具备深度思考链的 `deepseek-reasoner`）。

---

## 🌟 核心功能特性

### 1. 随时修改 System Prompt 与丰富预设
- **即时生效**：在 Web 界面随时调整系统提示词，下一次用户提问或对话即刻应用全新约束规则。
- **经典行为模版库**：
  - 🧠 **苏格拉底式追问导师**（测试模糊输入下的主动澄清与克制能力）
  - 🛡️ **零废话严格 JSON 提取器**（测试极端纯净格式约束与无 markdown 噪音）
  - 🛠️ **强制工具核验智能体**（测试面对复杂数学与时间问题时的工具调用纪律）
  - 💡 **DeepSeek-R1 深度思考推理**（观测深度思维链推演与反思过程）
  - 🚫 **极简守门人与越狱防御**（测试敏感诱导防御与字数硬限制）
- **便捷快捷约束插入**：支持一键追加核心准则、负向禁令、输出格式、思维链引导等 Prompt 构件。

### 2. 深度支持 DeepSeek 官方全部模型与调用参数
严格对齐 [DeepSeek 官方 API 指南](https://api-docs.deepseek.com/zh-cn/)：
- **模型切换**：
  - `deepseek-chat`：DeepSeek-V3 旗舰通用对话模型，超快响应；
  - `deepseek-reasoner`：DeepSeek-R1 深度思考模型，打字机流式展示完整 **思考推演过程（Reasoning Content）**。
- **全套采样与惩罚参数**：
  - `temperature`：采样温度（0.0 ~ 2.0，提供算术/代码 0.0、R1建议 0.6、标准 1.0、创意 1.3 预设点）；
  - `top_p`：核采样阈值（0.0 ~ 1.0）；
  - `max_tokens`：最大输出 Token 数（支持最高 8192）；
  - `frequency_penalty` & `presence_penalty`：词频惩罚与存在惩罚（-2.0 ~ 2.0）；
  - `response_format`：支持强制 `text` 或 `json_object` 结构化输出；
  - `stop`：自定义停止词。

### 3. 高韧性 Agent Loop 执行循环 (参考 `D:\project\aibase\agent_loop`)
- **双模态流式解耦**：思考链流（`reasoning-delta`）、打字机正文流（`text-delta`）与工具调用结构体完全解耦，前端绝无 JSON 碎片闪烁；
- **自修正与纠错回环（Repair Loop）**：工具参数不匹配 Zod 定义时自动构造堆栈纠错重试；
- **调用指纹去重与熔断（Circuit Breaker）**：硬性限制迭代轮次（默认 10 轮），严防相同工具连续调用导致死循环；
- **原生支持全链路 AbortSignal 取消**：随时点击「停止」按钮瞬间中断生成；
- **内置实用工具箱**：
  - `calculator`（精确数学四则运算与复合算式）；
  - `web_search`（网络与知识库检索模拟）；
  - `get_current_time`（系统实时日期与时区）；
  - `scratchpad`（多步工作记忆备忘暂存）。

### 4. 实验目的与预期行为跟踪
- 随时记录**实验目的**（想达到的目标行为）与**预期评判标准**；
- 预设测试输入快捷填入（点击即可一键填入用户测试语句）。

### 5. 项目内置 Evaluator Agent Loop (评测智能体)
- **角色定位**：资深 Prompt 工程评测专家，充当裁判对实验进行深度复盘；
- **自主审查与多维裁决**：
  - 🏆 **裁决结论**：PASS（完全符合预期）/ PARTIAL（部分符合）/ FAIL（未达标）；
  - 💯 **量化打分**：0 ~ 100 分综合得分；
  - 🔍 **规则遵从度核验**：逐项比对模型是否遵守了 System Prompt 的指令与负向约束；
  - 🛠️ **System Prompt 优化建议**：指出缺陷并提供改良版提示词草案，支持**一键采纳**！
- **用户可自由配置评测智能体**：可自定义 Evaluator 的 System Prompt、模型型号与温度。

### 6. 会话清空、归档库与 A/B 横向对比
- **清空会话**：重置当前画布消息与状态，完整保留 System Prompt、实验目的与参数以便立即展开下一轮测试；
- **归档本次实验**：将提示词、模型参数、目的、完整对话轨迹、工具日志与评测得分持久化保存；
- **实验归档库**：检索、查看详情、一键导出 Markdown 格式报告或一键恢复到工作区；
- **A/B 实验横向对比**：左右双栏并排比对两份实验的 System Prompt、模型反应与评测表现。

---

## 🏗️ 项目架构

```
d:\project\prompt-loop-lab\
├── package.json               # 项目依赖与启动脚本
├── tsconfig.json             # TypeScript 全局配置
├── vite.config.ts            # Vite 8 前端配置与后端代理
├── index.html                # 前端主入口 HTML
├── .env.example              # 环境变量范本
├── src\
│   ├── client\               # React 前端界面
│   │   ├── main.tsx          # 前端挂载
│   │   ├── App.tsx           # 主布局与数据流驱动
│   │   ├── presets.ts        # 经典实验模版与测试用例
│   │   ├── types.ts          # 前端状态与数据模型定义
│   │   └── components\
│   │       ├── Header.tsx             # 顶部导航、状态与模型切换
│   │       ├── SystemPromptEditor.tsx # 提示词编辑器与约束组件
│   │       ├── ExperimentGoalCard.tsx # 实验目的与预期卡片
│   │       ├── ModelParamsConfig.tsx  # DeepSeek 全参数控制器
│   │       ├── ChatSession.tsx        # 对话画布与实时打字机
│   │       ├── ReasoningBlock.tsx     # 深度思考流 (R1) 折叠卡片
│   │       ├── ToolCallBlock.tsx      # 工具调用轨迹与执行回环
│   │       ├── EvaluatorPanel.tsx     # 内置 Evaluator 评测智能体面板
│   │       ├── ArchiveDrawer.tsx      # 实验归档库抽屉与导出
│   │       ├── ABCompareModal.tsx     # A/B 实验双栏横向对比
│   │       ├── SettingsModal.tsx      # DeepSeek API 密钥与地址配置
│   │       └── SaveArchiveModal.tsx   # 归档保存确认弹窗
│   ├── server\               # Node.js / Express 后端服务
│   │   ├── index.ts          # API 路由与 SSE 流式端点
│   │   ├── deepseek.ts       # DeepSeek API 客户端与 ILoopChatModel 适配器
│   │   ├── agent.ts          # Agent Loop 驱动引擎
│   │   ├── evaluator.ts      # 内置 Evaluator Agent Loop 实现
│   │   ├── tools.ts          # 内置计算器、检索、时间与便签工具
│   │   └── storage.ts        # 本地 JSON 实验归档与配置持久化
│   └── agent-loop\           # 核心 Agent Loop 执行引擎 (源自 agent_loop)
│       ├── loop\             # AgentLoop 主循环逻辑
│       ├── correction\       # 纠错回环与熔断器
│       ├── state\            # 状态机与快照管理
│       ├── stream\           # 双模态流分发器与工具缓冲拼装
│       ├── tools\            # 工具定义与注册表
│       └── types\            # 事件、模型与状态接口契约
└── data\
    └── archives\             # 实验归档数据存储 (JSON 格式)
```

---

## 🚀 Windows 快速启动指南

### 1. 安装依赖
打开 Windows PowerShell / CMD，进入项目根目录：
```powershell
pnpm install
# 或者使用 npm:
npm install
```

### 2. 配置 DeepSeek API Key
你可以通过以下任一方式配置 API Key：
- **方式一（推荐）**：启动 Web 界面后，点击右上角「未填 API Key / 设置」按钮，直接填入 Key 并测试保存；
- **方式二**：复制 `.env.example` 为 `.env`，填入：
  ```env
  DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
  DEEPSEEK_BASE_URL=https://api.deepseek.com
  PORT=3001
  ```

### 3. 启动开发服务器
一键启动前端（Vite: 5173）与后端（Express: 3001）：
```powershell
pnpm run dev
# 或者:
npm run dev
```

### 4. 访问系统
在浏览器打开：
👉 **http://localhost:5173**

---

## 🧪 推荐实验演示流程

1. **第 1 步：选择实验模版**
   - 在左侧「系统提示词」面板右上角的模版下拉框中，选择 **「1. 苏格拉底式追问导师」**；
   - 系统将自动加载设定好的系统提示词、实验目的、评判标准与推荐温度。
2. **第 2 步：发送测试提问**
   - 在中间画布下方，直接点击快捷测试输入：“`我想买一台电脑，帮我推荐一下。`”，然后点击「发送」；
   - 观测 Agent Loop 是否遵循了“绝不直接给出方案，而是主动反问 3 个澄清问题”的规则。
3. **第 3 步：运行 Evaluator 智能评测**
   - 对话完成后，点击右侧栏上方的「**🤖 启动智能评估**」按钮；
   - 内置 Evaluator Agent Loop 将自动复盘本次实验，给出 PASS 结论、综合得分（例如 96分）与深度点评。
4. **第 4 步：归档本次实验**
   - 点击顶部右上角「**归档本次实验**」，输入标题确认归档；
   - 随时点击「**实验归档库**」查看所有历史实验或导出 Markdown 报告；
   - 点击「**A/B 对比**」，可以将刚才的实验与系统内置的对照组（直接盲目回答实验）进行并排横向对比！
5. **第 5 步：切换模型与工具测试**
   - 切换模型为 `deepseek-reasoner`，体验 DeepSeek-R1 的动态深度思考推演链；
   - 切换模版至「**强制工具核验智能体**」，测试计算器工具的实时触发与自我纠错能力。

---

## 📜 许可证

本项目遵循 MIT 协议开发与开源。

# 💪 健康管家

基于 [pi](https://github.com/earendil-works/pi)（`pi-ai` + `pi-agent-core`）构建的**对话式个人健康助手**。覆盖饮食营养、健身运动、身体数据追踪与日常习惯管理，用自然语言即可使用，全部数据持久化到本地 SQLite。

## 功能特性

- 📸 **拍照识别食材**：上传冰箱照片，视觉模型识别并保存食材
- 📋 **菜谱生成 / 🛒 购物清单 / 📊 营养分析**：饮食营养全套
- 🏋️ **训练计划与动作指导**：按目标、器械、天数生成训练计划，讲解动作要领
- 📏 **身体数据追踪**：记录体重/体脂，追踪减脂增肌进度
- 🎯 **目标管理**：减脂、增肌、睡眠、饮水等目标设置与状态跟踪
- 💧 **习惯打卡**：睡眠、饮水、心态等日常习惯记录
- ⭐ **收藏 / 📋 历史 / ⚙️ 偏好**：对话中即可管理
- 🔌 **多模型支持**：OpenAI / Gemini / DeepSeek / Moonshot(Kimi) / MiniMax / Anthropic / 通义千问 / 智谱 GLM，以及**自定义 OpenAI 兼容端点**（自填 Base URL + 模型 ID），网页内切换、填 Key、测试连接

## 技术栈

- **运行时**：Bun（`bun:sqlite` + `Bun.serve`）
- **Agent 框架**：`@earendil-works/pi-agent-core`
- **统一 LLM 接口**：`@earendil-works/pi-ai`
- **数据存储**：SQLite

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 启动

```bash
bun run dev
```

浏览器打开 <http://localhost:3000>。

### 3. 配置模型（网页内完成）

点击右上角 **⚙️ 设置中心**：选择模型提供商 → 填写 API Key → 「测试连接」→ 「保存」。切换模型即时生效，不丢会话。

选「自定义（OpenAI 兼容）」时，额外填写 **Base URL** 和 **模型 ID**，即可接入 Ollama / vLLM / LM Studio 或任意 OpenAI 兼容代理。

> 也可以复制 `.env.example` 为 `.env` 预填，界面里设置的 key 会覆盖 `.env`。key 存本地 SQLite，请勿提交 `*.db`。

## 使用示例

**饮食**：「我冰箱里有鸡蛋和西红柿，给 2 个人做一顿晚餐」／（上传照片自动识别食材）／「分析一下这些菜的营养」

**健身**：「给我制定一个 3 天的减脂训练计划，无器械」／「记录我今天慢跑 30 分钟」／「我最近的训练记录」

**身体**：「记录体重 70kg」／「我的体重变化」

**目标与习惯**：「设置目标：减脂到 65kg」／「昨晚睡了 7 小时」／「喝水打卡」

## 项目结构

```
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # 入口：装配并启动
    ├── config.ts             # 静态配置（端口/路径/模型 ID）
    ├── settings.ts           # 运行时设置（模型 + key，SQLite 持久化）
    ├── models.ts             # 4 家模型 provider + 模型选择
    ├── agent.ts              # Agent 组装
    ├── system-prompt.ts      # 健康管家人设
    ├── prompts/nutrition.ts  # 营养分析提示词
    ├── db/database.ts        # SQLite 数据层（9 张表）
    ├── tools/                # Agent 工具（食材/收藏/历史/偏好/营养/训练/身体/目标/习惯）
    └── server/
        ├── server.ts         # Bun.serve + SSE 流式 + 设置接口
        └── static/           # 聊天前端 + 设置面板
```

## 架构说明

应用是**一个对话 Agent + 一组工具**：

- **智能部分由 Agent 的 LLM 承担**：识别食材、生成菜谱/训练计划、给建议都发生在对话里；
- **工具只做确定性副作用**：读写 SQLite、营养分析子调用；
- **模型可运行时切换**：设置中心改模型即给 `agent.state.model` 赋新值，key 同步到 provider 解析。

## 许可

MIT License

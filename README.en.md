# 🏠 Umami — A Health Companion That Stays Home

[中文](README.md) · **English**

> Turn meals, movement, and one very real fridge into small things you can actually care for.

Umami is a local-first personal health companion for people whose days are spent at a desk, between takeout, unfinished plans, and the occasional promise to “start tomorrow.” It begins with a gentler question: **what would you like to take care of today?**

Log a meal. Record a workout. Step on a scale. Ask Tuntun what to cook with the tomatoes in your fridge. Umami brings those small actions together without turning your life into a spreadsheet.

Built with [pi](https://github.com/earendil-works/pi), `pi-ai`, `pi-agent-core`, Bun, and SQLite, Umami keeps health records, conversations, and settings on your machine by default. When you explicitly grant AI data consent and use a cloud model feature, only the context needed for that request is sent to the selected provider.

> ⚡ **Prefer your coding assistant?** Try [Umami-Skill for Health](https://github.com/renchenxuan/Umami-Skill-for-Health) for a lightweight chat-first experience. Use this Web app for the visual fridge, Today workspace, and Tuntun; use the Skill edition for quick natural-language logging wherever you work.

## The daily loop

```text
Open Umami
    ↓
Today: see your state and one useful next step
    ↓
Quick record: meal · workout · weight · habit
    ↓
Ask Tuntun: turn “what now?” into a clear action
    ↓
Fridge / Little Kitchen: turn advice into dinner
```

### Start with Today

The desktop Today workspace brings calories, workout minutes, habit completion, weight, recent activity, and next actions into one warm kitchen cockpit. It reads local aggregate data only; opening the home view does not silently call an AI model.

### Record one thing

Quick Record reuses the existing meal, workout, weight, and habit forms instead of making you fill in a second set of forms. Low-risk records are saved immediately and return a reversible “Recorded” receipt. Clearing data, deleting favorites, changing preferences, and deleting reminders still require confirmation.

### Let Tuntun help with the next step

Tuntun is Umami’s little rice-ball kitchen companion. It waits with you, naps, celebrates successful actions, and helps turn vague intentions into something doable. On first launch, Tuntun presents a local three-step guide. Its example conversation is static: it never sends a message or calls a model by itself.

## v4.1 — A clearer Today dashboard and trustworthy data flows

Building on v4.0’s local-first model and explicit AI consent boundary, v4.1 makes the Today entry point calmer, clearer, and more resilient:

- 🌀 **Today dashboard**: a four-part record-coverage ring, open data rows, and timelines replace the repetitive metric-card grid; clicking the active Today tab smoothly returns to the top.
- 🧭 **Mobile task entry**: the primary navigation is now Today, Record, Fridge, and Ask Tuntun; Diet, Little Kitchen, Training, Health Profile, Automations, Skills, and Settings live under More.
- 📡 **Trustworthy reads and failure feedback**: core reads share one request wrapper that preserves error codes, field errors, and request IDs; refresh failures keep existing data visible and expose a retry path.
- 🧾 **Accurate AI data disclosures**: recommendations, fridge advice, chat, and scheduled tasks describe the fields they actually send; chat and scheduled runs follow a minimum-necessary-read policy.
- ♿ **More complete interaction paths**: field-level error focus, keyboard actions, chart text summaries, touch targets, and mobile safe-area spacing are covered consistently.

## v4.0 — A trustworthy contract for a better today

v4.0 is about making every record, AI request, and home-screen visit understandable and controllable:

- 🔐 **One global consent boundary**: chat, image recognition, recommendations, analysis, tutorials, and AI fridge advice all share one explicit AI data-consent state. Revoking it immediately blocks later model calls while local records remain available.
- ✍️ **Risk-aware writes**: meals, workouts, weight, habits, ingredients, favorites, and tutorials can be recorded automatically with undo support. Destructive or high-risk actions still ask for confirmation.
- 🧳 **Recoverable health data packages**: exports include complete messages, schedules, fridge settings, health data, and board state. Imports preview and back up before merging, repair conflicting IDs, and never include model keys, map keys, or system credentials.
- 🏠 **Today loop**: Today connects status, quick logging, next actions, recent activity, and Tuntun instead of dropping you into an empty free-form board.
- 🫶 **Tuntun onboarding**: a static three-step first-run guide introduces logging, the fridge, Little Kitchen, and Ask Tuntun. Reopen it from **More → User guide** or Settings.
- 🍃 **Kitchen cockpit visual language**: emerald, aurora atmosphere, ingredient imagery, Tuntun, an editorial status strip, offset action modules, and a record timeline create hierarchy without changing the mobile navigation model.

## What it can do

### Food and fridge

- 📸 Upload a fridge photo, recognize ingredients, and save them locally
- 🍳 Generate recipes, scale servings, estimate nutrition, and log meals
- 🛒 Manage shopping lists, fridge zones, freshness reminders, and AI freshness suggestions
- 📚 Browse 36 built-in home-cooking tutorials in **Little Kitchen**, or generate and edit your own

### Training and body data

- 🏋️ Generate workout plans and movement guidance from goals, equipment, and schedule
- 📏 Track weight, body fat, daily body metrics, and trends
- 🎯 Manage goals such as fat loss, muscle gain, sleep, and hydration
- 💧 Track sleep, water, mood, and other daily habits
- 🗺️ With Baidu, Amap, or Google Maps connected, plan nearby parks, tracks, walking, and cycling routes

### Tuntun and the workspace

- 🍙 A local animated mascot that waits, naps, reacts, and celebrates
- 💬 Isolated conversations with search, relative timestamps, day grouping, and deletion
- ⏰ Natural-language schedules for daily, weekly, or one-time reminders
- 🧩 A free-form board remains available through **Organize board**; positions and hidden cards are preserved
- 🌅 Aurora, steam, dust, kitchen silhouettes, success ripples, three ambience levels, and reduced-motion support

## Privacy and data boundaries

“Local-first” does not mean that a cloud model request can never leave your machine. Umami makes the boundary visible:

1. **Without AI consent**: structured pages, health records, fridge management, and import/export remain usable; user content is not sent to a model.
2. **With AI consent**: only an explicitly used feature sends the data categories it needs to the current model provider. Each AI feature shows its provider and data disclosure.
3. **After revocation**: later chat, image, recommendation, analysis, tutorial-generation, and freshness-advice calls are blocked. A fixed connection test carries no user content and is not covered by this consent state.
4. **Secrets**: model keys are not stored in SQLite and are never exported. Windows uses Credential Manager first; other platforms fall back to environment variables.
5. **Health boundary**: AI output is general health information or nutrition estimation, not medical diagnosis. Consult a qualified professional for allergies, illness, medication, or urgent situations.

## Quick start

### 1. Install

```bash
bun install
```

### 2. Run

```bash
bun run dev
```

Open <http://localhost:3000>.

### 3. Configure a model

You can read the local Tuntun guide without an API key. To use chat, image recognition, recommendations, analysis, AI-generated tutorials, or AI fridge advice:

1. Open **Settings**;
2. Choose a provider and enter its API key;
3. Select **Test connection**, then **Save**;
4. In **AI data consent**, explicitly authorize sending user-provided content to the model provider.

The supported providers include OpenAI, Gemini, DeepSeek, Moonshot/Kimi, MiniMax, Anthropic, Qwen, and GLM. A custom OpenAI-compatible endpoint requires a Base URL and model ID. For SSRF and redirect safety, custom endpoints are disabled by default and require `ALLOW_UNSAFE_CUSTOM_ENDPOINTS=true`; the address must resolve to a public HTTP(S) network target, never localhost or a private network.

> You may copy `.env.example` to `.env` for initial configuration. Do not commit `.env` or `*.db` files.

## Things you can say

```text
Food: I have eggs and tomatoes. Make dinner for two.
Training: Build a three-day, no-equipment fat-loss plan.
Logging: Record a 30-minute run for today.
Body: Record my weight as 70 kg.
Goals: Set a goal to reach 65 kg.
Habits: I slept seven hours. Mark today’s water habit complete.
Automation: Remind me to log dinner every day at 6 PM.
```

## Tech stack

- **Runtime**: Bun (`bun:sqlite` + `Bun.serve`)
- **Agent framework**: `@earendil-works/pi-agent-core`
- **Unified LLM interface**: `@earendil-works/pi-ai`
- **Storage**: SQLite
- **Frontend**: native HTML, CSS, and JavaScript with a local sprite-based Tuntun mascot

## Project structure

```text
├── package.json
├── tsconfig.json
├── .env.example
├── tools/pet-atlas/         # Deterministic Tuntun sprite generation pipeline
└── src/
    ├── index.ts              # Application entry point and scheduler setup
    ├── config.ts             # Static configuration
    ├── settings.ts           # Runtime model settings and secret storage adapter
    ├── ai-data-policy.ts     # AI data categories and provider disclosures
    ├── secrets.ts            # Platform secret storage adapter
    ├── models.ts             # Providers and custom endpoint support
    ├── agent.ts              # Agent assembly
    ├── system-prompt.ts      # Umami persona and behavior
    ├── skills/               # Health guidance and safety boundaries
    ├── api-types.ts          # REST and SSE types
    ├── prompts/nutrition.ts  # Nutrition prompts
    ├── db/database.ts        # SQLite layer and schema migrations
    ├── db/tutorial-presets.ts # Built-in Little Kitchen tutorials
    ├── tools/                # Health, fridge, recipe, map, and schedule tools
    └── server/
        ├── server.ts         # Bun.serve, consent endpoints, and event stream
        ├── api.ts            # v1 REST API and import/export
        ├── today.ts          # Local Today aggregation
        ├── conversations.ts  # Conversation Agent, SSE, and reminders
        ├── scheduler.ts      # Scheduled task runner
        ├── diet-summary.ts   # Daily and weekly calorie summaries
        ├── events.ts         # Server event bus
        └── static/           # Web UI, settings, and Tuntun mascot
```

## Architecture in one minute

- **Structured pages are model-independent**: food, training, diet, body data, and local import/export remain usable without a key or network connection.
- **The Agent handles intelligence**: ingredient recognition, recipe and workout generation, and general health information; it does not provide medical diagnosis or treatment.
- **Tools handle deterministic side effects**: SQLite writes, nutrition calculations, reminders, and reversible Actions.
- **Conversations are isolated and recoverable**: each conversation persists messages and has its own Agent context; each request uses a snapshot of the active model configuration.

## Status

Umami is currently **v4.1.0** and still evolving. Ideas, bug reports, and pull requests are welcome in the [issue tracker](https://github.com/renchenxuan/Umami/issues).

## License

MIT License

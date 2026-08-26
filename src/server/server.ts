import type { Agent } from "@earendil-works/pi-agent-core";
import type { ImageContent, Model } from "@earendil-works/pi-ai";
import { config, type ModelName } from "../config";
import type { RecipeDB } from "../db/database";
import { ALL_MODELS, type SettingsStore } from "../settings";
import { getModelByName, registerCustomProvider, type ModelsCollection } from "../models";

const STATIC_DIR = import.meta.dir + "/static";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

type SSEEvent = { type: string } & Record<string, unknown>;

/** 从 dataURL 或纯 base64 里抽出纯 base64 内容。 */
function normalizeBase64(input: string): string {
  const idx = input.indexOf(",");
  return idx >= 0 && input.startsWith("data:") ? input.slice(idx + 1) : input;
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(STATIC_DIR + rel);
  if (!(await file.exists())) return null;
  const ext = rel.slice(rel.lastIndexOf("."));
  return new Response(file, { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" } });
}

export function startServer(
  agent: Agent,
  db: RecipeDB,
  settings: SettingsStore,
  models: ModelsCollection,
): void {
  // 全局订阅：把 agent 事件路由到当前活跃的 SSE 写入器。
  let activeWriter: ((e: SSEEvent) => void) | null = null;
  agent.subscribe((event) => {
    if (!activeWriter) return;
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      activeWriter({ type: "delta", text: event.assistantMessageEvent.delta });
    } else if (event.type === "tool_execution_start") {
      activeWriter({ type: "tool_start", name: event.toolName });
    } else if (event.type === "tool_execution_end") {
      activeWriter({ type: "tool_end", name: event.toolName, isError: event.isError });
    }
  });

  // 串行化 prompt，保证单 Agent 状态一致（本地单用户足够）。
  let chain: Promise<void> = Promise.resolve();
  function runPrompt(prompt: string, images: ImageContent[], writer: (e: SSEEvent) => void): void {
    chain = chain.then(async () => {
      activeWriter = writer;
      try {
        await agent.prompt(prompt, images);
        const err = agent.state.errorMessage;
        if (err) {
          writer({ type: "error", message: err });
        } else {
          writer({ type: "done" });
        }
      } catch (e) {
        writer({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        activeWriter = null;
      }
    });
  }

  // 探测一个模型是否可用（发一条 ping）。
  async function ping(model: Model<any>): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await models.completeSimple(model, {
        messages: [{ role: "user", content: "ping", timestamp: Date.now() }],
      });
      if (res.stopReason === "error" || res.stopReason === "aborted") {
        return { ok: false, message: res.errorMessage ?? "连接失败" };
      }
      return { ok: true, message: "连接成功" };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  Bun.serve({
    port: config.port,
    async fetch(req) {
      const url = new URL(req.url);

      // 静态资源
      if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
        const res = await serveStatic(url.pathname);
        if (res) return res;
        return new Response("Not Found", { status: 404 });
      }

      // 现有食材（首屏展示）
      if (req.method === "GET" && url.pathname === "/api/ingredients") {
        return Response.json({ ingredients: db.getIngredients() });
      }

      // 设置：读取
      if (req.method === "GET" && url.pathname === "/api/settings") {
        return Response.json(settings.overview());
      }

      // 设置：保存（模型名 + 当前 provider 的 key + 自定义端点）
      if (req.method === "PUT" && url.pathname === "/api/settings") {
        let body: { modelName?: string; apiKey?: string; baseUrl?: string; modelId?: string };
        try {
          body = (await req.json()) as {
            modelName?: string;
            apiKey?: string;
            baseUrl?: string;
            modelId?: string;
          };
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const name = (body.modelName ?? settings.getModelName()) as ModelName;
        if (!ALL_MODELS.includes(name)) {
          return Response.json({ ok: false, message: "无效的模型提供商" });
        }

        if (body.apiKey !== undefined && body.apiKey.trim() !== "") {
          settings.setKey(name, body.apiKey.trim());
        }

        // 自定义端点：保存 baseUrl / modelId 并重建 provider
        if (name === "custom") {
          if (body.baseUrl !== undefined && body.baseUrl.trim() !== "") {
            settings.set("custom_base_url", body.baseUrl.trim());
          }
          if (body.modelId !== undefined && body.modelId.trim() !== "") {
            settings.set("custom_model", body.modelId.trim());
          }
          registerCustomProvider(models, settings.get("custom_base_url"), settings.get("custom_model"));
        }

        try {
          const model = getModelByName(models, settings, name);
          if (!settings.getKey(name)) {
            return Response.json({ ok: false, message: `模型 "${name}" 缺少 API Key，请在设置中心填写对应 key` });
          }
          settings.setModelName(name);
          agent.state.model = model;
          return Response.json({ ok: true, ...settings.overview() });
        } catch (e) {
          return Response.json({ ok: false, message: (e as Error).message });
        }
      }

      // 设置：测试连接（临时写入 key，测完恢复）
      if (req.method === "POST" && url.pathname === "/api/settings/test") {
        let body: { provider?: string; key?: string; baseUrl?: string; modelId?: string };
        try {
          body = (await req.json()) as {
            provider?: string;
            key?: string;
            baseUrl?: string;
            modelId?: string;
          };
        } catch {
          return new Response("Bad Request", { status: 400 });
        }
        const provider = body.provider as ModelName;
        const key = (body.key ?? "").trim();
        if (!ALL_MODELS.includes(provider)) {
          return Response.json({ ok: false, message: "无效的模型提供商" });
        }
        if (!key) {
          return Response.json({ ok: false, message: "请先填写 API Key" });
        }

        const prevKey = settings.getKey(provider);
        settings.setKey(provider, key);

        // 自定义：临时用给定 baseUrl/modelId 注册一个 provider 测试，测完恢复
        if (provider === "custom") {
          const prevBaseUrl = settings.get("custom_base_url");
          const prevModel = settings.get("custom_model");
          const testBaseUrl = body.baseUrl?.trim() || prevBaseUrl;
          const testModel = body.modelId?.trim() || prevModel;
          if (!testBaseUrl || !testModel) {
            settings.setKey(provider, prevKey);
            return Response.json({ ok: false, message: "请填写 Base URL 和模型 ID" });
          }
          registerCustomProvider(models, testBaseUrl, testModel);
          try {
            const m = models.getModel("custom", testModel)!;
            return Response.json(await ping(m));
          } finally {
            settings.setKey(provider, prevKey);
            registerCustomProvider(models, prevBaseUrl, prevModel);
          }
        }

        try {
          const m = getModelByName(models, settings, provider);
          return Response.json(await ping(m));
        } finally {
          settings.setKey(provider, prevKey);
        }
      }

      // 聊天（SSE 流式返回）
      if (req.method === "POST" && url.pathname === "/api/chat") {
        let body: { text?: string; imageBase64?: string; mimeType?: string };
        try {
          body = (await req.json()) as { text?: string; imageBase64?: string; mimeType?: string };
        } catch {
          return new Response("Bad Request", { status: 400 });
        }
        const text = (body.text ?? "").trim();
        const images: ImageContent[] = body.imageBase64
          ? [{ type: "image", data: normalizeBase64(body.imageBase64), mimeType: body.mimeType ?? "image/jpeg" }]
          : [];
        if (!text && images.length === 0) {
          return new Response("空消息", { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const writer = (e: SSEEvent) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
            };
            writer({ type: "start" });
            runPrompt(text, images, (e) => {
              writer(e);
              if (e.type === "done" || e.type === "error") {
                controller.close();
              }
            });
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`✅ 服务已启动：http://localhost:${config.port}`);
}

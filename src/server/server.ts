import type { Agent } from "@earendil-works/pi-agent-core";
import type { Model, TextContent } from "@earendil-works/pi-ai";
import { config, unsafeCustomEndpointsEnabled, type ModelName } from "../config";
import type { RecipeDB } from "../db/database";
import { ALL_MODELS, type SettingsStore } from "../settings";
import { buildTemporaryCustomModels, getModelByName, listModelCatalog, registerCustomProvider, type ModelsCollection } from "../models";
import { handleV1, MAX_JSON_BYTES, validateCustomBaseUrl } from "./api";
import { ConversationAgentManager, type ConversationAgentFactory } from "./conversations";
import { safeProviderMessage } from "./errors";
export { safeProviderMessage } from "./errors";
import { listSkillMeta } from "../skills";
import { buildRecommendationProfile, buildRecommendationUserPrompt, parseRecommendations, RECOMMENDATION_SYSTEM_PROMPT } from "./recommendations";
import { buildAnalysisProfile, buildAnalysisUserPrompt, parseAnalysis, ANALYSIS_SYSTEM_PROMPT, type AnalysisPeriod } from "./analysis";

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

async function parseJson<T>(req: Request): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(raw) as T;
}

function settingsResponse(path:string,payload:Record<string,unknown>,status=200):Response {
  if(!path.startsWith("/api/v1/")) return Response.json(payload,{status});
  const requestId=crypto.randomUUID();
  if(payload.ok===false)return Response.json({ok:false,error:{code:"MODEL_SETTINGS_ERROR",message:String(payload.message??"模型设置失败"),requestId}},{status:status===200?400:status});
  return Response.json({ok:true,data:payload,requestId},{status});
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(STATIC_DIR + rel);
  if (!(await file.exists())) return null;
  const ext = rel.slice(rel.lastIndexOf("."));
  return new Response(file, { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "no-store" } });
}

export async function probeModel(collection:Pick<ModelsCollection,"completeSimple">,model:Model<any>,apiKey:string):Promise<{ok:boolean;message:string}>{
  try{
    const res=await collection.completeSimple(model,{messages:[{role:"user",content:"ping",timestamp:Date.now()}]},{apiKey,timeoutMs:15000,maxRetries:0});
    if(res.stopReason==="error"||res.stopReason==="aborted")return{ok:false,message:safeProviderMessage(res.errorMessage??"连接失败",[apiKey])};
    return{ok:true,message:"连接成功"};
  }catch(error){return{ok:false,message:safeProviderMessage(error,[apiKey])}}
}

export function validateLocalRequest(req:Request,port:number):"HOST_REJECTED"|"ORIGIN_REJECTED"|null{
  const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`]);
  const host=(req.headers.get("host")??"").toLowerCase();
  if(!allowedHosts.has(host))return"HOST_REJECTED";
  const origin=req.headers.get("origin");
  if(!origin)return null;
  try{
    const parsed=new URL(origin);
    if(parsed.protocol!=="http:"||parsed.username||parsed.password||!allowedHosts.has(parsed.host.toLowerCase())||parsed.origin!==origin)return"ORIGIN_REJECTED";
    return null;
  }catch{return"ORIGIN_REJECTED"}
}

export function startServer(
  agent: Agent,
  db: RecipeDB,
  settings: SettingsStore,
  models: ModelsCollection,
  options:{port?:number;conversationAgentFactory?:ConversationAgentFactory}={},
): ReturnType<typeof Bun.serve> {
  const conversationAgents=new ConversationAgentManager(db,settings,models,options.conversationAgentFactory??(()=>agent));

  let server:ReturnType<typeof Bun.serve>;
  server=Bun.serve({
    hostname: "127.0.0.1",
    port: options.port??config.port,
    idleTimeout: 120,
    async fetch(req) {
      const url = new URL(req.url);

      const localRequestError=validateLocalRequest(req,Number(server.port));
      if(localRequestError){
        return Response.json({ok:false,error:{code:localRequestError,message:localRequestError==="HOST_REJECTED"?"Host 必须是本机回环地址与当前端口":"Origin 必须是本机回环地址与当前端口",requestId:crypto.randomUUID()}},{status:403});
      }
      const declaredLength = Number(req.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_JSON_BYTES) {
        return Response.json({ ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "请求体过大", requestId: crypto.randomUUID() } }, { status: 413 });
      }

      // 静态资源
      if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
        const res = await serveStatic(url.pathname);
        if (res) return res;
        return new Response("Not Found", { status: 404 });
      }

      // v1 模型设置接口复用现有 provider 能力；key 仅保留在当前进程环境中。
      if (req.method === "GET" && url.pathname === "/api/v1/settings/model") {
        return Response.json({ ok: true, data: settings.overview(), requestId: crypto.randomUUID() });
      }

      // 现有食材（首屏展示）
      if (req.method === "GET" && url.pathname === "/api/ingredients") {
        return Response.json({ ingredients: db.getIngredients() });
      }

      // 技能中心：列出技能与当前启用状态
      if (req.method === "GET" && url.pathname === "/api/v1/skills") {
        return Response.json({ ok: true, data: { skills: listSkillMeta(), enabled: settings.getEnabledSkills() }, requestId: crypto.randomUUID() });
      }
      // 技能中心：保存启用的技能集合
      if (req.method === "PUT" && url.pathname === "/api/v1/skills/enabled") {
        const requestId = crypto.randomUUID();
        let body: { enabled?: unknown };
        try { body = await parseJson<typeof body>(req); }
        catch { return Response.json({ ok: false, error: { code: "PAYLOAD_INVALID", message: "请求体无效", requestId } }, { status: 400 }); }
        const ids = Array.isArray(body.enabled) ? body.enabled.filter((x): x is string => typeof x === "string") : [];
        settings.setEnabledSkills(ids);
        return Response.json({ ok: true, data: { enabled: settings.getEnabledSkills() }, requestId });
      }

      // 模型目录：各 provider 可选的模型列表（供设置中心做模型选择）
      if (req.method === "GET" && url.pathname === "/api/v1/model-catalog") {
        return Response.json({ ok: true, data: listModelCatalog(models), requestId: crypto.randomUUID() });
      }

      // 设置：读取
      if (req.method === "GET" && url.pathname === "/api/settings") {
        const base = settings.overview();
        let model = "";
        try { model = getModelByName(models, settings, settings.getModelName()).id; } catch { /* 忽略 */ }
        return Response.json({ ...base, model });
      }

      // 设置：保存（模型名 + 当前 provider 的 key + 自定义端点）
      if (req.method === "PUT" && (url.pathname === "/api/settings" || url.pathname === "/api/v1/settings/model")) {
        let body: { modelName?: string; apiKey?: string; baseUrl?: string; modelId?: string; uiTheme?: string };
        try {
          body = await parseJson<typeof body>(req);
        } catch (e) {
          return settingsResponse(url.pathname,{ ok: false, message: e instanceof Error && e.message === "PAYLOAD_TOO_LARGE" ? "请求体过大" : "请求体无效" },e instanceof Error && e.message === "PAYLOAD_TOO_LARGE" ? 413 : 400);
        }

        const name = (body.modelName ?? settings.getModelName()) as ModelName;
        if (!ALL_MODELS.includes(name)) {
          return settingsResponse(url.pathname,{ ok: false, message: "无效的模型提供商" },422);
        }

        try {
          // Validate every custom URL, including a value loaded from an older database, before registration.
          if (name === "custom") {
            if(!unsafeCustomEndpointsEnabled())return settingsResponse(url.pathname,{ok:false,message:"自定义端点网络调用默认禁用；仅在明确接受 SSRF 与重定向风险后设置 ALLOW_UNSAFE_CUSTOM_ENDPOINTS=true"},403);
            const candidate=body.baseUrl?.trim()||settings.get("custom_base_url");
            if(!candidate||!await validateCustomBaseUrl(candidate))return settingsResponse(url.pathname,{ok:false,message:"Base URL 必须是可解析到公网的 HTTP(S) 地址，不能指向本机或私有网络"},422);
            settings.set("custom_base_url",candidate);
            if(body.modelId?.trim())settings.set("custom_model",body.modelId.trim());
            registerCustomProvider(models,candidate,settings.get("custom_model"));
          }
          if (name !== "custom" && body.modelId?.trim()) settings.setModelOverride(name, body.modelId.trim());
          if (body.apiKey?.trim()) settings.setKey(name, body.apiKey.trim());
          if (body.uiTheme && ["light", "dark", "aurora"].includes(body.uiTheme)) settings.setUiTheme(body.uiTheme);
          const model = getModelByName(models, settings, name);
          if (!settings.getKey(name)) {
            return settingsResponse(url.pathname,{ ok: false, message: `模型 "${name}" 缺少 API Key，请在设置中心填写对应 key` },422);
          }
          settings.setModelName(name);
          agent.state.model = model;
          const result = { ok: true, ...settings.overview() };
          return settingsResponse(url.pathname,result);
        } catch (e) {
          return settingsResponse(url.pathname,{ ok: false, message: safeProviderMessage(e,settings.getSecretValues()) },500);
        }
      }

      // 设置：测试连接（临时写入 key，测完恢复）
      if (req.method === "POST" && (url.pathname === "/api/settings/test" || url.pathname === "/api/v1/settings/model/capabilities")) {
        let body: { provider?: string; key?: string; baseUrl?: string; modelId?: string };
        try {
          body = await parseJson<typeof body>(req);
        } catch {
          return settingsResponse(url.pathname,{ok:false,message:"请求体无效"},400);
        }
        const provider = body.provider as ModelName;
        const key = (body.key ?? "").trim();
        if (!ALL_MODELS.includes(provider)) {
          return settingsResponse(url.pathname,{ ok: false, message: "无效的模型提供商" },422);
        }
        if (!key) {
          return settingsResponse(url.pathname,{ ok: false, message: "请先填写 API Key" },422);
        }

        // 自定义：使用请求作用域 Models，不改全局 provider、设置或凭据存储。
        if (provider === "custom") {
          if(!unsafeCustomEndpointsEnabled())return settingsResponse(url.pathname,{ok:false,message:"自定义端点网络调用默认禁用；仅在明确接受 SSRF 与重定向风险后设置 ALLOW_UNSAFE_CUSTOM_ENDPOINTS=true"},403);
          const testBaseUrl = body.baseUrl?.trim() || settings.get("custom_base_url");
          const testModel = body.modelId?.trim() || settings.get("custom_model");
          if (!testBaseUrl || !testModel) {
            return settingsResponse(url.pathname,{ ok: false, message: "请填写 Base URL 和模型 ID" },422);
          }
          if (!await validateCustomBaseUrl(testBaseUrl)) {
            return settingsResponse(url.pathname,{ ok: false, message: "Base URL 必须是可解析到公网的 HTTP(S) 地址，不能指向本机或私有网络" },422);
          }
          const temporary=buildTemporaryCustomModels(testBaseUrl,testModel);
          return settingsResponse(url.pathname,{...await probeModel(temporary.models,temporary.model,key),unsafeCustomEndpoint:true});
        }

        const m = getModelByName(models, settings, provider);
        return settingsResponse(url.pathname,await probeModel(models,m,key));
      }

      const conversationMessage=url.pathname.match(/^\/api\/v1\/conversations\/(\d+)\/messages$/);
      if(req.method==="POST"&&conversationMessage){
        const conversationId=Number(conversationMessage[1]);
        if(!Number.isSafeInteger(conversationId)||conversationId<=0)return Response.json({ok:false,error:{code:"INVALID_ID",message:"ID 无效",requestId:crypto.randomUUID()}},{status:400});
        return conversationAgents.response(req,conversationId);
      }

      // 个性化推荐：根据身体数据 + 目标 + 偏好生成每日/每周食谱与运动计划
      if (req.method === "POST" && url.pathname === "/api/v1/recommendations") {
        const requestId = crypto.randomUUID();
        try {
          let consent: { privacyConsent?: boolean } = {};
          try { consent = await parseJson<{ privacyConsent?: boolean }>(req); } catch { /* 按未授权处理，避免读取健康数据 */ }
          if (consent.privacyConsent !== true) {
            return Response.json({ ok: false, error: { code: "PRIVACY_CONSENT_REQUIRED", message: "发送健康数据前需要明确确认本次数据流向", requestId } }, { status: 428 });
          }
          const providerName = settings.getModelName();
          if (!settings.getKey(providerName)) {
            return Response.json({ ok: false, error: { code: "MODEL_NOT_CONFIGURED", message: `模型 "${providerName}" 缺少 API Key，请先在设置中心配置`, requestId } }, { status: 422 });
          }
          const model = getModelByName(models, settings, providerName);
          const profile = buildRecommendationProfile(db);
          const response = await models.complete(model, {
            systemPrompt: RECOMMENDATION_SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildRecommendationUserPrompt(profile), timestamp: Date.now() }],
          });
          const raw = response.content
            .filter((b): b is TextContent => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          const recommendation = parseRecommendations(raw);
          return Response.json({ ok: true, data: { hasProfile: profile.hasProfile, ...recommendation }, requestId });
        } catch (e) {
          return Response.json({ ok: false, error: { code: "RECOMMENDATION_ERROR", message: safeProviderMessage(e, settings.getSecretValues()), requestId } }, { status: 500 });
        }
      }

      // 健康分析：根据饮食/运动/身体数据生成每日或每周分析
      if (req.method === "POST" && url.pathname === "/api/v1/analysis") {
        const requestId = crypto.randomUUID();
        const period: AnalysisPeriod = url.searchParams.get("period") === "weekly" ? "weekly" : "daily";
        try {
          let consent: { privacyConsent?: boolean } = {};
          try { consent = await parseJson<{ privacyConsent?: boolean }>(req); } catch { /* 按未授权处理，避免读取健康数据 */ }
          if (consent.privacyConsent !== true) {
            return Response.json({ ok: false, error: { code: "PRIVACY_CONSENT_REQUIRED", message: "发送健康数据前需要明确确认本次数据流向", requestId } }, { status: 428 });
          }
          const providerName = settings.getModelName();
          if (!settings.getKey(providerName)) {
            return Response.json({ ok: false, error: { code: "MODEL_NOT_CONFIGURED", message: `模型 "${providerName}" 缺少 API Key，请先在设置中心配置`, requestId } }, { status: 422 });
          }
          const model = getModelByName(models, settings, providerName);
          const profile = buildAnalysisProfile(db, period);
          const response = await models.complete(model, {
            systemPrompt: ANALYSIS_SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildAnalysisUserPrompt(profile), timestamp: Date.now() }],
          });
          const raw = response.content.filter((b): b is TextContent => b.type === "text").map((b) => b.text).join("\n");
          return Response.json({ ok: true, data: { period, text: parseAnalysis(raw) }, requestId });
        } catch (e) {
          return Response.json({ ok: false, error: { code: "ANALYSIS_ERROR", message: safeProviderMessage(e, settings.getSecretValues()), requestId } }, { status: 500 });
        }
      }

      // 冰箱 AI 保鲜检测：读取冰箱现有食材与温度设置，让模型给出临期/过期判断与保鲜建议
      if (req.method === "POST" && url.pathname === "/api/v1/fridge/ai-check") {
        const requestId = crypto.randomUUID();
        try {
          const providerName = settings.getModelName();
          if (!settings.getKey(providerName)) {
            return Response.json({ ok: false, error: { code: "MODEL_NOT_CONFIGURED", message: `模型 "${providerName}" 缺少 API Key，请先在设置中心配置`, requestId } }, { status: 422 });
          }
          const model = getModelByName(models, settings, providerName);
          const items = db.getIngredients();
          const fs = db.getFridgeSettings();
          const now = Date.now();
          const lines = items.length
            ? items.map((i) => {
                const daysIn = Math.max(0, Math.round((now - Date.parse(i.added_at)) / 86400000));
                const zoneLabel = i.zone === "freezer" ? "冷冻" : "冷藏";
                const note = (i.note || "").trim();
                return `- ${i.name}（分类：${i.category}，分区：${zoneLabel}，数量：${i.quantity || "若干"}，加入时间：${String(i.added_at).slice(0, 10)}，已存放约 ${daysIn} 天${note ? `，备注：${note}` : ""}）`;
              }).join("\n")
            : "（冰箱目前是空的）";
          const userPrompt =
            `我的冰箱设置：冷冻层目标 ${fs.freezerTemp}°C，冷藏层目标 ${fs.fridgeTemp}°C。\n` +
            `当前冰箱食材清单：\n${lines}\n\n` +
            `请基于食材分类与已存放天数，帮我判断：1）哪些食材可能临期或已经不新鲜；2）保鲜与尽快食用的建议；3）若有不新鲜食材，给出处理建议。请用简洁的中文分点回答，不要编造清单里没有的食材。`;
          const FRIDGE_AI_SYSTEM_PROMPT = "你是「膳待家」的冰箱保鲜助手，依据用户提供的冰箱食材、存放天数与温度设置，给出客观、简洁的临期/保鲜判断与食用建议。只依据用户提供的数据，不编造。用中文回答。";
          const response = await models.complete(model, {
            systemPrompt: FRIDGE_AI_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt, timestamp: Date.now() }],
          });
          const raw = response.content.filter((b): b is TextContent => b.type === "text").map((b) => b.text).join("\n");
          return Response.json({ ok: true, data: { text: raw || "暂时无法生成保鲜分析。" }, requestId });
        } catch (e) {
          return Response.json({ ok: false, error: { code: "FRIDGE_AI_ERROR", message: safeProviderMessage(e, settings.getSecretValues()), requestId } }, { status: 500 });
        }
      }

      const v1Response = await handleV1(req, url, db);
      if (v1Response) return v1Response;

      // 聊天（SSE 流式返回）
      if (req.method === "POST" && url.pathname === "/api/chat") {
        return conversationAgents.response(req,db.getOrCreateLegacyConversation());
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`✅ 服务已启动：http://127.0.0.1:${server.port}`);
  return server;
}

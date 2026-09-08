import {
  Type,
  type Static,
  type Models,
  type Model,
  type Context,
  type TextContent,
} from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { text } from "./helpers";
import { NUTRITION_PROMPT } from "../prompts/nutrition";
import { extractJson } from "../server/json";

const AnalyzeNutritionSchema = Type.Object({
  week_plan: Type.String(),
});

function formatNutrition(data: Record<string, unknown>): string {
  const daily = data.daily as Record<string, unknown> | undefined;
  if (!daily) return "";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(daily)) {
    lines.push(`- ${k}: ${v}`);
  }
  return lines.join("\n");
}

export function createNutritionTool(models: Models, getModel: () => Model<any>, settings?: import("../settings").SettingsStore): AgentTool<any> {
  return {
    name: "analyze_nutrition",
    label: "营养分析",
    description:
      "分析给定一周菜谱的营养（卡路里、蛋白质、碳水、脂肪），并给出建议。需要传入完整的菜谱文本。",
    parameters: AnalyzeNutritionSchema,
    execute: async (_id, params) => {
      const p = params as Static<typeof AnalyzeNutritionSchema>;
      const plan = p.week_plan.trim();
      if (!plan) {
        return { content: [text("请先提供菜谱内容，我才能做营养分析。")], details: null };
      }
      if (settings && !settings.getAiConsent().granted) {
        return { content: [text("营养分析需要先在设置中心完成一次 AI 数据授权。")], details: { code: "AI_CONSENT_REQUIRED" } };
      }

      const context: Context = {
        systemPrompt: NUTRITION_PROMPT,
        messages: [{ role: "user", content: `一周菜谱：\n${plan}`, timestamp: Date.now() }],
      };

      try {
        const response = await models.complete(getModel(), context);
        const raw = response.content
          .filter((b): b is TextContent => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        const parsed = extractJson(raw);
        if (parsed) {
          const summary = formatNutrition(parsed);
          const suggestions = parsed.suggestions ? String(parsed.suggestions) : "";
          const body = summary + (suggestions ? `\n\n营养建议：${suggestions}` : "");
          return { content: [text(body)], details: parsed };
        }
        return { content: [text(raw)], details: { raw } };
      } catch (e) {
        return { content: [text(`营养分析失败：${(e as Error).message}`)], details: null };
      }
    },
  };
}

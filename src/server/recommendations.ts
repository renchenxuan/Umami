import type { RecipeDB } from "../db/database";
import { HEALTH_GUIDANCE_SKILL } from "../skills/health-guidance";

/** 推荐端点与主 Agent 共享同一份健康边界技能。 */
export const RECOMMENDATION_SYSTEM_PROMPT = `你是为繁忙久坐人群提供通用健康信息的助手。请给出贴合生活节奏的饮食与运动建议：食谱快手、易采购；运动时间高效、适合办公室或家里完成。

${HEALTH_GUIDANCE_SKILL}

请始终用中文，语气专业但亲切。输出必须是严格的 JSON 对象，不要包含 markdown 代码块或额外解释，结构如下：
{
  "daily": [ {"meal": "早餐", "foods": ["燕麦粥", "水煮蛋", "牛奶"], "note": "5 分钟快手"} ],
  "weekly": [ {"day": "周一", "foods": ["青椒土豆丝炒肉", "杂粮饭"], "note": ""} ],
  "workout": [ {"day": "周一", "type": "有氧", "items": ["慢跑 30 分钟", "全身拉伸"], "note": ""} ],
  "note": "一句话说明本推荐基于哪些用户数据，并注明仅供参考、不能替代专业医疗建议"
}
daily 为今日三餐（早餐/午餐/晚餐，可含加餐）；weekly 为一周 7 天（周一到周日）每天的食谱；workout 为一周运动安排。foods 与 items 用简洁的菜名/动作名数组，不要写长篇做法。`;

/** 从数据库收集用于推荐的个人画像。 */
export function buildRecommendationProfile(db: RecipeDB) {
  const metrics = db.getBodyMetrics().slice(0, 14);
  return {
    bodyMetrics: metrics,
    goals: db.getGoals(),
    preferences: db.getPreferences(),
    ingredients: db.getIngredients(),
    hasProfile: metrics.length > 0 || db.getGoals().length > 0,
  };
}

export type RecommendationProfile = ReturnType<typeof buildRecommendationProfile>;

function fmtMetric(m: { date: string; weight_kg: number; body_fat_pct: number | null }): string {
  return `${m.date} 体重 ${m.weight_kg}kg${m.body_fat_pct != null ? "，体脂 " + m.body_fat_pct + "%" : ""}`;
}

/** 把画像转成用户提示词。 */
export function buildRecommendationUserPrompt(profile: RecommendationProfile): string {
  const p = profile.preferences;
  const lines: string[] = [];
  lines.push("请根据我的情况生成个性化健康推荐。");
  if (profile.bodyMetrics.length) {
    lines.push("身体数据（近期）：" + profile.bodyMetrics.map(fmtMetric).join("；"));
  } else {
    lines.push("身体数据：暂无记录（请给出普适、适合久坐人群的建议）。");
  }
  if (profile.goals.length) {
    lines.push("我的目标：" + profile.goals.map((g) => `${g.name}（目标 ${g.target || "—"}${g.unit || ""}，状态 ${g.status}）`).join("；"));
  }
  if (profile.ingredients.length) {
    lines.push("冰箱里现有食材：" + profile.ingredients.map((i) => i.name).join("、") + "。请优先用这些食材设计菜谱；若不够，可推荐需要额外购买的新食材。");
  } else {
    lines.push("冰箱：暂无食材（推荐时请列出需要购买的食材）。");
  }
  lines.push(`偏好：${p.people_count} 人，口味「${p.taste_preference}」，菜系「${p.cuisine_style}」，忌口「${p.allergies || "无"}」`);
  lines.push("请输出 JSON（daily / weekly / workout / note 四个字段）。");
  return lines.join("\n");
}

/** 从模型输出提取 JSON（容忍 markdown 代码块包裹）。 */
function extractJson(raw: string): Record<string, unknown> | null {
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(stripped);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface RecommendationItem {
  meal?: string;
  day?: string;
  foods?: string[];
  type?: string;
  items?: string[];
  note?: string;
}

export interface Recommendation {
  daily: RecommendationItem[];
  weekly: RecommendationItem[];
  workout: RecommendationItem[];
  note: string;
  raw?: string;
}

function asItemArray(v: unknown): RecommendationItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      meal: typeof x.meal === "string" ? x.meal : undefined,
      day: typeof x.day === "string" ? x.day : undefined,
      foods: Array.isArray(x.foods) ? x.foods.map(String) : undefined,
      type: typeof x.type === "string" ? x.type : undefined,
      items: Array.isArray(x.items) ? x.items.map(String) : undefined,
      note: typeof x.note === "string" ? x.note : undefined,
    }));
}

/** 解析推荐结果；解析失败或结构不符时退回原始文本。 */
export function parseRecommendations(raw: string): Recommendation {
  const parsed = extractJson(raw);
  if (parsed) {
    const daily = asItemArray(parsed.daily);
    const weekly = asItemArray(parsed.weekly);
    const workout = asItemArray(parsed.workout);
    if (daily.length || weekly.length || workout.length) {
      return {
        daily,
        weekly,
        workout,
        note: typeof parsed.note === "string" ? parsed.note.trim() : "",
      };
    }
  }
  return { daily: [], weekly: [], workout: [], note: "", raw };
}

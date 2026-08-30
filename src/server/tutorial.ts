import type { RecipeDB } from "../db/database";
import { HEALTH_GUIDANCE_SKILL } from "../skills/health-guidance";

/** 教学菜谱生成端点与主 Agent 共享同一份健康边界技能。 */
export const TUTORIAL_SYSTEM_PROMPT = `你是为新手下厨者写教学菜谱的助手，语气耐心、步骤可执行。

${HEALTH_GUIDANCE_SKILL}

根据用户想学的菜与冰箱现有食材，输出严格的 JSON 对象（不要 markdown 代码块或额外解释），结构如下：
{
  "title": "番茄炒蛋",
  "servings": 2,
  "total_minutes": 20,
  "ingredients": [ {"name": "番茄", "amount": "400g（约2个）", "note": "需购买"} ],
  "prep": ["番茄顶部划十字，开水烫 30 秒后去皮，切滚刀块", "鸡蛋打散加 1g 盐和几滴料酒"],
  "cook": ["热锅冷油，油温六成热下蛋液，刚凝固就盛出", "…"],
  "tips": "新手最易翻车：蛋液炒老；番茄要炒出汁再回锅蛋…"
}
要求：
- title 为菜名；servings 为份量（人数，整数）；total_minutes 为含准备的总耗时（分钟，整数）；
- 食材准备必须给出具体克数/个数/毫升，并符合 servings 人份的换算，note 写「需购买」或替代建议，没有备注则省略 note；
- prep 为切配与预处理（腌制/调碗汁等），cook 为烹饪步骤（火候、下料顺序、时长），均按顺序编号式短句，cook 的关键节点写清状态判断；
- tips 概括新手最容易失败的 1-3 个点；
- 优先使用冰箱已有食材；用户的过敏与忌口食材绝对不能出现。
始终用中文。`;

/** 教学菜谱的结构化结果（存入 recipes 表：title + ingredients + steps）。 */
export interface TutorialResult {
  title: string;
  servings: number;
  total_minutes: number | null;
  ingredients: Array<{ name: string; amount: string; note?: string }>;
  prep: string[];
  cook: string[];
  tips: string;
}

export function buildTutorialProfile(db: RecipeDB) {
  return {
    ingredients: db.getIngredients(),
    preferences: db.getPreferences(),
  };
}

export type TutorialProfile = ReturnType<typeof buildTutorialProfile>;

export function buildTutorialUserPrompt(profile: TutorialProfile, dish: string, servings?: number): string {
  const p = profile.preferences;
  const lines: string[] = [];
  lines.push(`请教我做「${dish}」，输出完整的教学 JSON。`);
  lines.push(`份量：${servings ? `${servings} 人份` : `按默认 ${p.people_count} 人份`}，并在 servings 字段注明。`);
  if (profile.ingredients.length) {
    lines.push("冰箱里现有食材（优先使用，需购买的在 note 标注）：");
    lines.push(profile.ingredients.map((i) => `- ${i.name}${i.quantity ? `（${i.quantity}）` : ""}`).join("\n"));
  } else {
    lines.push("冰箱目前是空的：全部食材在 note 标注「需购买」。");
  }
  lines.push(`口味：「${p.taste_preference}」；忌口/过敏：「${p.allergies || "无"}」（绝对不能出现）。`);
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

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** 解析并校验教学菜谱；结构不符返回 null（由端点转为用户可读错误）。 */
export function parseTutorial(raw: string): TutorialResult | null {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const title = asString(parsed.title);
  const servings = typeof parsed.servings === "number" && Number.isInteger(parsed.servings) && parsed.servings >= 1 && parsed.servings <= 20 ? parsed.servings : null;
  const ingredientsRaw = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  const ingredients = ingredientsRaw
    .map((item) => {
      const ing = item as Record<string, unknown>;
      const name = asString(ing?.name);
      const amount = asString(ing?.amount);
      const note = asString(ing?.note);
      return name && amount ? { name: name.slice(0, 120), amount: amount.slice(0, 80), ...(note ? { note: note.slice(0, 200) } : {}) } : null;
    })
    .filter((x): x is TutorialResult["ingredients"][number] => x !== null);
  const prep = Array.isArray(parsed.prep) ? parsed.prep.map(asString).filter(Boolean).slice(0, 30) : [];
  const cook = Array.isArray(parsed.cook) ? parsed.cook.map(asString).filter(Boolean).slice(0, 30) : [];
  const totalMinutes =
    typeof parsed.total_minutes === "number" && Number.isInteger(parsed.total_minutes) && parsed.total_minutes >= 1 && parsed.total_minutes <= 600
      ? parsed.total_minutes
      : null;
  const tips = asString(parsed.tips).slice(0, 800);
  if (!title || !servings || !ingredients.length || !cook.length) return null;
  return { title: title.slice(0, 200), servings, total_minutes: totalMinutes, ingredients, prep, cook, tips };
}

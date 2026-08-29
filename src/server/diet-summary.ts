import type { RecipeDB, DietLog, Preferences, HealthGoal } from "../db/database";

export interface MealNutrition { kcal: number; protein: number; fat: number; carb: number }
export interface DietSummary {
  today: {
    date: string;
    total: MealNutrition;
    meals: Record<string, MealNutrition>;
    items: Array<{ meal_type: string; name: string; quantity?: string; grams: number; kcal: number | null; source: string }>;
  };
  week: Array<{ date: string; kcal: number }>;
  target: { kcal: number; source: "manual" | "auto"; bmr: number | null; tdee: number | null } | null;
}

const EMPTY_MEAL = (): MealNutrition => ({ kcal: 0, protein: 0, fat: 0, carb: 0 });

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * 每日热量目标：Mifflin-St Jeor BMR × 活动系数 = TDEE，
 * 再按目标调整（减脂 -400 / 增肌 +300），clamp 到 1200–4000。
 * 手动设置的 preferences.calorie_target 优先。
 */
export function estimateCalorieTarget(prefs: Preferences, weightKg: number | null, goals: HealthGoal[]): { kcal: number; source: "manual" | "auto"; bmr: number | null; tdee: number | null } | null {
  if (prefs.calorie_target && prefs.calorie_target > 0) return { kcal: prefs.calorie_target, source: "manual", bmr: null, tdee: null };
  const height = prefs.height_cm;
  const age = prefs.age;
  if (!height || !age || !weightKg) return null;
  const genderOffset = prefs.gender === "男" ? 5 : prefs.gender === "女" ? -161 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * height - 5 * age + genderOffset);
  const activityFactor = { "久坐": 1.2, "轻度": 1.375, "中度": 1.55, "高强度": 1.725 }[prefs.activity_level] ?? 1.375;
  const tdee = Math.round(bmr * activityFactor);
  const goalText = goals.map((g) => `${g.name}${g.category}${g.target}`).join(" ");
  let adjusted = tdee;
  if (/减脂|减重|减肥|瘦/.test(goalText)) adjusted = tdee - 400;
  else if (/增肌|增重|肌肉/.test(goalText)) adjusted = tdee + 300;
  const kcal = Math.min(4000, Math.max(1200, Math.round(adjusted / 10) * 10));
  return { kcal, source: "auto", bmr, tdee };
}

function sumMeal(target: MealNutrition, item: Record<string, unknown>) {
  target.kcal += typeof item.kcal === "number" ? item.kcal : 0;
  target.protein += typeof item.protein === "number" ? item.protein : 0;
  target.fat += typeof item.fat === "number" ? item.fat : 0;
  target.carb += typeof item.carb === "number" ? item.carb : 0;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** 汇总今日摄入（各餐与逐项）、近 7 天热量序列与每日目标。 */
export function buildDietSummary(db: RecipeDB): DietSummary {
  const logs = db.getDietLogs() as DietLog[];
  const today = localDate();
  const total = EMPTY_MEAL();
  const meals: Record<string, MealNutrition> = {};
  const items: DietSummary["today"]["items"] = [];
  for (const log of logs.filter((l) => l.date === today)) {
    const meal = meals[log.meal_type] ?? EMPTY_MEAL();
    if (!meals[log.meal_type]) meals[log.meal_type] = meal;
    if (Array.isArray(log.foods)) {
      for (const raw of log.foods) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        sumMeal(total, item);
        sumMeal(meal, item);
        items.push({ meal_type: log.meal_type, name: String(item.name ?? ""), quantity: typeof item.quantity === "string" ? item.quantity : undefined, grams: Number(item.grams ?? 0), kcal: typeof item.kcal === "number" ? item.kcal : null, source: String(item.source ?? "estimate") });
      }
    }
  }
  const week: Array<{ date: string; kcal: number }> = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const date = localDate(d);
    const kcal = logs.filter((l) => l.date === date).reduce((sum, l) => sum + (l.total_kcal ?? 0), 0);
    week.push({ date, kcal });
  }
  const latestWeight = db.getBodyMetrics()[0]?.weight_kg ?? null;
  const target = estimateCalorieTarget(db.getPreferences(), latestWeight, db.getGoals());
  return {
    today: { date: today, total: { kcal: Math.round(total.kcal), protein: round1(total.protein), fat: round1(total.fat), carb: round1(total.carb) }, meals, items },
    week,
    target,
  };
}

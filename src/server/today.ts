import type { RecipeDB, Ingredient } from "../db/database";
import { buildDietSummary } from "./diet-summary";
import type { TodayView } from "../api-types";

const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shelfLifeDays: Record<string, number> = { 蔬菜: 5, 水果: 7, 肉类: 3, 蛋奶: 12, 水产: 2, 主食: 30, 豆制品: 5, 菌菇: 5, 调味: 180, 坚果: 120, 其他: 14 };
function isExpiring(item: Ingredient, fridgeTemp: number, freezerTemp: number, now = Date.now()): boolean {
  const added = Date.parse(item.added_at.replace(" ", "T"));
  if (!Number.isFinite(added)) return false;
  const age = Math.max(0, Math.floor((now - new Date(item.added_at.slice(0, 10) + "T00:00:00").getTime()) / 86400000));
  const base = shelfLifeDays[item.category] ?? 14;
  let life = item.zone === "freezer" ? Math.round(base * 8) : base;
  if (item.zone === "freezer" && freezerTemp > -12) life = Math.round(life * 0.8);
  if (item.zone !== "freezer" && fridgeTemp > 6) life = Math.round(life * 0.7);
  return age >= life * 0.7;
}

export function buildTodayView(db: RecipeDB, configured: boolean, consentGranted: boolean): TodayView {
  const date = localDate();
  const diet = buildDietSummary(db);
  const workouts = db.getWorkouts().filter((item) => item.date === date);
  const habits = db.getHabits().filter((item) => item.date === date);
  const bodyMetrics = db.getBodyMetrics();
  const activities: TodayView["recentActivity"] = [];
  for (const item of db.getDietLogs().filter((log) => log.date === date).slice(0, 8)) activities.push({ type: "diet", id: item.id, label: `${item.meal_type}饮食记录`, occurredAt: item.created_at });
  for (const item of workouts) activities.push({ type: "workout", id: item.id, label: `训练 ${item.activity_type} ${item.duration_min}分钟`, occurredAt: item.created_at });
  for (const item of habits) activities.push({ type: "habit", id: item.id, label: `习惯打卡：${item.habit}`, occurredAt: item.created_at });
  const metric = bodyMetrics.find((item) => item.date === date);
  if (metric) activities.push({ type: "weight", id: metric.id, label: `体重 ${metric.weight_kg}kg`, occurredAt: metric.created_at });
  activities.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const fridge = db.getFridgeSettings();
  return {
    date,
    metrics: { dietKcal: diet.today.total.kcal, calorieTarget: diet.target?.kcal ?? null, workoutMinutes: workouts.reduce((sum, item) => sum + item.duration_min, 0), habitCompleted: habits.length, latestWeight: bodyMetrics[0]?.weight_kg ?? null },
    expiringIngredients: db.getIngredients().filter((item) => isExpiring(item, fridge.fridgeTemp, fridge.freezerTemp)).slice(0, 8),
    recentActivity: activities.slice(0, 10),
    ai: { configured, consentGranted },
  };
}

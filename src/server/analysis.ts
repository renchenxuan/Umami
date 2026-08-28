import type { RecipeDB } from "../db/database";
import { HEALTH_GUIDANCE_SKILL } from "../skills/health-guidance";

export const ANALYSIS_SYSTEM_PROMPT = `你是为繁忙久坐人群提供通用健康信息的助手。

${HEALTH_GUIDANCE_SKILL}

请根据用户的饮食、运动与身体数据记录，生成客观、鼓励性的健康分析。用中文，采用简洁的 markdown 结构（## 小节标题 + 要点列表）。重点：结合趋势而非单点数据，指出积极进展与可改进处，给出具体可执行的小建议，不诊断疾病、不伪装精确。`;

export type AnalysisPeriod = "daily" | "weekly";

function localDayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildAnalysisProfile(db: RecipeDB, period: AnalysisPeriod) {
  const since = localDayOffset(period === "daily" ? 0 : 6);
  const today = localDayOffset(0);
  const dietLogs = db.getDietLogs().filter((d) => d.date >= since && d.date <= today);
  const workouts = db.getWorkouts().filter((w) => w.date >= since && w.date <= today);
  return {
    period,
    dietLogs,
    workouts,
    bodyMetrics: db.getBodyMetrics().slice(0, 14),
    goals: db.getGoals(),
    preferences: db.getPreferences(),
  };
}

export type AnalysisProfile = ReturnType<typeof buildAnalysisProfile>;

function fmtMetric(m: { date: string; weight_kg: number; body_fat_pct: number | null }): string {
  return `${m.date} 体重 ${m.weight_kg}kg${m.body_fat_pct != null ? "，体脂 " + m.body_fat_pct + "%" : ""}`;
}

export function buildAnalysisUserPrompt(profile: AnalysisProfile): string {
  const p = profile.preferences;
  const lines: string[] = [];
  lines.push(`请给我一份${profile.period === "daily" ? "每日" : "每周"}健康分析。`);
  if (profile.dietLogs.length) {
    lines.push(
      "饮食记录：" +
        profile.dietLogs
          .map((d) => {
            const names = Array.isArray(d.foods) ? (d.foods as Array<{ name?: string }>).map((f) => f?.name).filter(Boolean).join("、") : "";
            return `${d.date} ${d.meal_type}：${names || "无"}`;
          })
          .join("；"),
    );
  } else {
    lines.push("饮食记录：暂无。");
  }
  if (profile.workouts.length) {
    lines.push("运动记录：" + profile.workouts.map((w) => `${w.date} ${w.activity_type} ${w.duration_min}分钟`).join("；"));
  } else {
    lines.push("运动记录：暂无。");
  }
  if (profile.bodyMetrics.length) {
    lines.push("身体数据（近期）：" + profile.bodyMetrics.map(fmtMetric).join("；"));
  }
  if (profile.goals.length) {
    lines.push("目标：" + profile.goals.map((g) => `${g.name}（目标 ${g.target || "—"}${g.unit || ""}，${g.status}）`).join("；"));
  }
  lines.push(`偏好：${p.people_count} 人，口味「${p.taste_preference}」，忌口「${p.allergies || "无"}」`);
  lines.push("请输出 markdown 分析。");
  return lines.join("\n");
}

/** 分析为自由文本，直接返回去除包裹代码块的原文。 */
export function parseAnalysis(raw: string): string {
  return raw.replace(/```(?:markdown|md)?\s*/gi, "").replace(/```/g, "").trim();
}

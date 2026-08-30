import { HEALTH_GUIDANCE_SKILL } from "./health-guidance";
import { RECIPE_RECOMMENDATION_SKILL } from "./recipe-recommendation";
import { FITNESS_RECOMMENDATION_SKILL } from "./fitness-recommendation";
import { DIET_LOGGING_SKILL } from "./diet-logging";
import { COOKING_TUTORIAL_SKILL } from "./cooking-tutorial";

/**
 * 技能注册表：前端「技能中心」与后端系统提示组装共用同一份清单。
 * 新增技能时，只需在此追加一项（content 为技能说明正文，会从 SKILL.md 或字符串读取）。
 */
export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  /** 简短的 SVG 图标（受信任的静态字符串，前端用 innerHTML 渲染） */
  icon: string;
  /** 拼进系统提示的技能正文 */
  content: string;
}

const LEAF_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 4 13C4 8 8 4 13 4c4 0 7 3 7 7 0 4-3 9-9 9Z"/><path d="M11 20c0-5 2-9 7-11"/></svg>`;
const BOWL_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M3 11a9 9 0 0 1 18 0"/><path d="M12 2v2M8 3v2M16 3v2"/></svg>`;
const PULSE_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2 6 4-14 2 8h6"/></svg>`;
const FORK_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v10"/><path d="M14 2v10"/><path d="M6 2v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V2"/><path d="M12 12v10"/></svg>`;
const CHEF_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18h12v3H6z"/><path d="M6 18a7 7 0 1 1 12-5.3A4.5 4.5 0 0 0 17 4a4.5 4.5 0 0 0-4.5 4A4.5 4.5 0 0 0 8 4a4.5 4.5 0 0 0-1 8.7A7 7 0 0 1 6 18Z"/></svg>`;

export const SKILLS: SkillMeta[] = [
  {
    id: "health-guidance",
    name: "健康饮食指导",
    description:
      "内置的营养与膳食权威指南，确保食材识别、菜谱生成与营养分析都符合均衡、份量与安全原则。默认开启，关闭后将仅按通用助手方式回答。",
    icon: LEAF_ICON,
    content: HEALTH_GUIDANCE_SKILL,
  },
  {
    id: "recipe-recommendation",
    name: "食谱推荐",
    description:
      "生成菜谱前必须先读取冰箱现有食材、结合你的偏好与忌口，优先消耗已有与易坏食材，并自动保存历史供面板查看。",
    icon: BOWL_ICON,
    content: RECIPE_RECOMMENDATION_SKILL,
  },
  {
    id: "fitness-recommendation",
    name: "健身推荐",
    description:
      "生成训练计划前先了解你的身体数据、目标与已有训练，按目标与器械条件安排力量/有氧/柔韧，并强调动作安全。",
    icon: PULSE_ICON,
    content: FITNESS_RECOMMENDATION_SKILL,
  },
  {
    id: "diet-logging",
    name: "饮食记录",
    description:
      "自动识别对话中的饮食内容并记录，支持早餐/午餐/晚餐/加餐，可结合记录给出营养分析与改进建议。",
    icon: FORK_ICON,
    content: DIET_LOGGING_SKILL,
  },
  {
    id: "cooking-tutorial",
    name: "烹饪教学",
    description:
      "用户问「X 怎么做」时进入教学模式：按人数换算食材克数、给切配与火候步骤、提示常见失败点，并保存到「菜谱教授」页供随时回看。",
    icon: CHEF_ICON,
    content: COOKING_TUTORIAL_SKILL,
  },
];

/** 默认全部启用（新增技能自动加入默认集合，除非被用户关闭）。 */
export const DEFAULT_ENABLED_SKILL_IDS = SKILLS.map((s) => s.id);

/** 仅返回元信息（不含正文），供前端技能中心展示。 */
export function listSkillMeta(): Array<Omit<SkillMeta, "content">> {
  return SKILLS.map(({ id, name, description, icon }) => ({ id, name, description, icon }));
}

/** 把启用技能的正文拼成系统提示的「已启用技能」段落。 */
export function buildSkillSection(enabledIds: string[]): string {
  const enabled = SKILLS.filter((s) => enabledIds.includes(s.id));
  if (!enabled.length) return "";
  return enabled.map((s) => `## 已启用技能：${s.name}\n\n${s.content}`).join("\n\n");
}

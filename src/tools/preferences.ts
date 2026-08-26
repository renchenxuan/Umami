import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const UpdatePreferencesSchema = Type.Object({
  people_count: Type.Optional(Type.Integer()),
  taste_preference: Type.Optional(Type.String()),
  allergies: Type.Optional(Type.String()),
  cuisine_style: Type.Optional(Type.String()),
  days: Type.Optional(Type.Integer()),
});

export function createPreferenceTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "get_preferences",
      label: "查看偏好",
      description: "查看用户的口味、人数、忌口、菜系等偏好设置。",
      parameters: Type.Object({}),
      execute: async () => {
        const prefs = db.getPreferences();
        const content =
          `当前偏好：${prefs.people_count} 人，口味「${prefs.taste_preference}」，` +
          `菜系「${prefs.cuisine_style}」，忌口「${prefs.allergies || "无"}」，默认 ${prefs.days} 天。`;
        return { content: [text(content)], details: prefs };
      },
    },
    {
      name: "update_preferences",
      label: "更新偏好",
      description: "更新用户的口味、人数、忌口、菜系、天数等偏好。",
      parameters: UpdatePreferencesSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof UpdatePreferencesSchema>;
        db.updatePreferences(p);
        return { content: [text("已更新偏好。")], details: db.getPreferences() };
      },
    },
  ];
}

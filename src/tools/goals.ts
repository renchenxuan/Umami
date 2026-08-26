import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const SetGoalSchema = Type.Object({
  name: Type.String(),
  category: Type.Optional(Type.String()),
  target: Type.Optional(Type.String()),
  unit: Type.Optional(Type.String()),
});

const UpdateGoalSchema = Type.Object({
  name: Type.String(),
  status: Type.String(),
});

export function createGoalTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "set_goal",
      label: "设置目标",
      description: "设置一个健康目标（减脂、增肌、耐力、睡眠、饮水等）。",
      parameters: SetGoalSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SetGoalSchema>;
        db.addGoal(p.name, p.category ?? "健康", p.target ?? "", p.unit ?? "");
        return { content: [text(`已设置目标：${p.name}`)], details: p };
      },
    },
    {
      name: "get_goals",
      label: "查看目标",
      description: "列出当前健康目标及状态。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getGoals();
        const content = items.length
          ? `健康目标：\n` +
            items
              .map(
                (g) =>
                  `- ${g.name}（${g.category}${g.target ? "，目标 " + g.target + (g.unit || "") : ""}，${g.status}）`,
              )
              .join("\n")
          : "还没有设置目标。";
        return { content: [text(content)], details: items };
      },
    },
    {
      name: "update_goal_status",
      label: "更新目标状态",
      description: "更新某个目标的状态（进行中/已完成/已放弃）。",
      parameters: UpdateGoalSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof UpdateGoalSchema>;
        db.updateGoalStatus(p.name, p.status);
        return { content: [text(`已更新目标「${p.name}」状态为：${p.status}`)], details: p };
      },
    },
  ];
}

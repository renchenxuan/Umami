import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text, todayISO } from "./helpers";

const LogWorkoutSchema = Type.Object({
  activity_type: Type.String(),
  duration_min: Type.Optional(Type.Integer()),
  detail: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
});

export function createWorkoutTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "log_workout",
      label: "记录训练",
      description: "记录一次训练（类型、时长、内容）。用户说「记一次训练」「我今天练了X」时调用。",
      parameters: LogWorkoutSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof LogWorkoutSchema>;
        db.addWorkout(p.date ?? todayISO(), p.activity_type, p.duration_min ?? 30, p.detail ?? "");
        return {
          content: [
            text(
              `已记录训练：${p.activity_type}${p.duration_min ? " " + p.duration_min + " 分钟" : ""}`,
            ),
          ],
          details: p,
        };
      },
    },
    {
      name: "get_workouts",
      label: "查看训练",
      description: "列出最近的训练记录。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getWorkouts();
        const content = items.length
          ? `最近训练记录：\n` +
            items
              .map(
                (w) =>
                  `- ${w.date} ${w.activity_type}${w.duration_min ? " " + w.duration_min + "分钟" : ""}${w.detail ? "：" + w.detail : ""}`,
              )
              .join("\n")
          : "还没有训练记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}

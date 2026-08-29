import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB, ScheduleType } from "../db/database";
import { text } from "./helpers";

const CreateScheduleSchema = Type.Object({
  title: Type.String({ description: "任务短标题，如「晚餐提醒」" }),
  message: Type.String({ description: "触发时写入会话的提醒内容" }),
  schedule_type: Type.Union([Type.Literal("daily"), Type.Literal("weekly"), Type.Literal("once")], { description: "daily=每天，weekly=每周指定几天，once=只触发一次" }),
  time_of_day: Type.String({ description: "24 小时制本地时间 HH:MM，如 18:00" }),
  weekdays: Type.Optional(Type.Array(Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4), Type.Literal(5), Type.Literal(6), Type.Literal(7)]), { description: "weekly 时必填：1=周一…7=周日" })),
  fire_date: Type.Optional(Type.String({ description: "once 时的触发日期 YYYY-MM-DD；省略则今天" })),
});

const DeleteScheduleSchema = Type.Object({ id: Type.Number({ description: "要删除的定时任务 id" }) });

const WEEKDAY_NAMES = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function describeSchedule(s: { id: number; title: string; schedule_type: ScheduleType; time_of_day: string; weekdays: number[] | null; enabled: number; next_fire_at: string | null }): string {
  const when = s.schedule_type === "weekly"
    ? `每周${(s.weekdays ?? []).map((d) => WEEKDAY_NAMES[d] ?? d).join("、")} ${s.time_of_day}`
    : `${s.schedule_type === "daily" ? "每天" : "一次"} ${s.time_of_day}`;
  return `- #${s.id}「${s.title}」${when}（${s.enabled ? "启用中" : "已停用"}，下次触发 ${s.next_fire_at ?? "—"} UTC）`;
}

export function createScheduleTools(db: RecipeDB, conversationId?: number): AgentTool<any>[] {
  const resolveConversationId = () => {
    if (conversationId !== undefined && db.getConversation(conversationId)) return conversationId;
    return db.getConversations()[0]?.id ?? db.createConversation("定时提醒");
  };
  return [
    {
      name: "create_schedule",
      label: "新建定时任务",
      description: [
        "创建一个定时任务，到点后自动在会话里发一条提醒并由 Agent 回应。",
        "把用户的自然语言时间转成参数：「每天晚上六点」→ schedule_type=daily, time_of_day=18:00；",
        "「工作日上午九点」→ weekly + weekdays=[1,2,3,4,5] + time_of_day=09:00；",
        "「明天早上八点提醒我一次」→ once + fire_date=明天的日期 + time_of_day=08:00。",
        "所有时间按用户本地时间理解。创建后告诉用户任务何时首次触发。",
      ].join(""),
      parameters: CreateScheduleSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof CreateScheduleSchema>;
        try {
          const newId = db.createSchedule({
            conversationId: resolveConversationId(),
            title: p.title,
            message: p.message,
            scheduleType: p.schedule_type,
            timeOfDay: p.time_of_day,
            weekdays: p.weekdays ?? null,
            fireDate: p.fire_date ?? null,
          });
          return { content: [text(`已创建定时任务 #${newId}。`)], details: db.getSchedule(newId) };
        } catch (error) {
          return { content: [text(`创建失败：${error instanceof Error ? error.message : "参数不合法"}`)], details: null };
        }
      },
    },
    {
      name: "list_schedules",
      label: "查看定时任务",
      description: "列出全部定时任务及其触发时间与启用状态。",
      parameters: Type.Object({}),
      execute: async () => {
        const schedules = db.getSchedules();
        const content = schedules.length ? `共 ${schedules.length} 个定时任务：\n` + schedules.map(describeSchedule).join("\n") : "还没有定时任务。";
        return { content: [text(content)], details: schedules };
      },
    },
    {
      name: "delete_schedule",
      label: "删除定时任务",
      description: "按 id 删除一个定时任务。",
      parameters: DeleteScheduleSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof DeleteScheduleSchema>;
        const target = db.getSchedule(p.id);
        if (!target) return { content: [text(`没有找到 #${p.id} 这个定时任务`)], details: null };
        db.deleteSchedule(p.id);
        return { content: [text(`已删除定时任务 #${p.id}「${target.title}」`)], details: target };
      },
    },
  ];
}

import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB, computeNextFire, utcStamp } from "../src/db/database";
import { buildModels } from "../src/models";
import { EnvSecretStore } from "../src/secrets";
import { startServer } from "../src/server/server";
import { SettingsStore } from "../src/settings";

describe("computeNextFire", () => {
  // 统一用本地时间构造基准点，断言换算成 UTC 后的期望值
  const at = (y: number, m: number, d: number, hh: number, mm: number) => new Date(y, m - 1, d, hh, mm);
  const utcOf = (date: Date) => utcStamp(date);

  test("daily: 当天未到用今天，已过用明天", () => {
    expect(computeNextFire("daily", "18:00", null, null, at(2026, 8, 29, 13, 0))).toBe(utcOf(at(2026, 8, 29, 18, 0)));
    expect(computeNextFire("daily", "18:00", null, null, at(2026, 8, 29, 18, 0))).toBe(utcOf(at(2026, 8, 30, 18, 0)));
  });

  test("weekly: 从匹配的下一天开始，含当天未过期", () => {
    // 2026-08-29 是周六；[周一,周五] → 下一个周一
    expect(computeNextFire("weekly", "09:00", [1, 5], null, at(2026, 8, 29, 20, 0))).toBe(utcOf(at(2026, 8, 31, 9, 0)));
    // 当天匹配且未过期 → 当天
    expect(computeNextFire("weekly", "09:00", [6], null, at(2026, 8, 29, 8, 0))).toBe(utcOf(at(2026, 8, 29, 9, 0)));
  });

  test("once: 指定日期触发，过期返回 null", () => {
    expect(computeNextFire("once", "08:00", null, "2026-08-30", at(2026, 8, 29, 13, 0))).toBe(utcOf(at(2026, 8, 30, 8, 0)));
    expect(computeNextFire("once", "08:00", null, "2026-08-28", at(2026, 8, 29, 13, 0))).toBeNull();
    // 无日期：当天未过用今天，已过则 null
    expect(computeNextFire("once", "23:30", null, null, at(2026, 8, 29, 13, 0))).toBe(utcOf(at(2026, 8, 29, 23, 30)));
    expect(computeNextFire("once", "08:00", null, null, at(2026, 8, 29, 13, 0))).toBeNull();
  });
});

describe("schedules CRUD", () => {
  test("create/get/update/markFired/delete 全链路", () => {
    const db = new RecipeDB(":memory:");
    const conversationId = db.createConversation("测试");
    const id = db.createSchedule({ conversationId, title: "晚餐提醒", message: "该吃晚饭啦", scheduleType: "daily", timeOfDay: "18:00" });
    const schedule = db.getSchedule(id);
    expect(schedule).toMatchObject({ title: "晚餐提醒", schedule_type: "daily", time_of_day: "18:00", enabled: 1 });
    expect(schedule?.next_fire_at).toBeTruthy();

    // 到期判定：把 next_fire_at 拨到过去
    db.updateSchedule(id, {});
    db["db"].query("UPDATE schedules SET next_fire_at='2000-01-01 00:00:00' WHERE id=?").run(id);
    expect(db.dueSchedules(utcStamp(new Date())).map((s) => s.id)).toContain(id);

    // 触发后推进到未来
    db.markScheduleFired(id, new Date());
    const after = db.getSchedule(id)!;
    expect(after.last_fired_at).toBeTruthy();
    expect(after.next_fire_at! > utcStamp(new Date())).toBe(true);
    expect(after.enabled).toBe(1);

    // once 触发后自动停用
    const onceId = db.createSchedule({ conversationId, title: "一次性", message: "x", scheduleType: "once", timeOfDay: "23:59" });
    db.markScheduleFired(onceId, new Date());
    expect(db.getSchedule(onceId)?.enabled).toBe(0);

    expect(db.deleteSchedule(id)).toBe(true);
    expect(db.getSchedule(id)).toBeNull();
    db.close();
  });

  test("校验非法输入", () => {
    const db = new RecipeDB(":memory:");
    const conversationId = db.createConversation("测试");
    expect(() => db.createSchedule({ conversationId, title: "t", message: "m", scheduleType: "daily", timeOfDay: "25:00" })).toThrow(RangeError);
    expect(() => db.createSchedule({ conversationId, title: "t", message: "m", scheduleType: "weekly", timeOfDay: "09:00" })).toThrow();
    expect(() => db.createSchedule({ conversationId, title: "t", message: "m", scheduleType: "once", timeOfDay: "08:00", fireDate: "2020-01-01" })).toThrow(RangeError);
    db.close();
  });
});

const start = () => {
  const db = new RecipeDB(":memory:");
  const settings = new SettingsStore(db, new EnvSecretStore());
  const models = { getModel: () => ({ provider: "openai", id: "test" }), setProvider: () => {}, completeSimple: async () => ({ stopReason: "stop" }) };
  const agent = { state: { model: {}, errorMessage: undefined }, subscribe: () => {}, prompt: async () => {} };
  const server = startServer(agent as any, db, settings, models as any, { port: 0 });
  return { db, server };
};

describe("schedules REST API", () => {
  const originalUnsafe = process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;
  afterEach(() => { if (originalUnsafe === undefined) delete process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS; else process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS = originalUnsafe; });

  test("POST/GET/PATCH/DELETE /api/v1/schedules", async () => {
    delete process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;
    const ctx = start();
    const port = ctx.server.port;
    const headers = { "content-type": "application/json", host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}` };
    try {
      const created = await fetch(`http://127.0.0.1:${port}/api/v1/schedules`, { method: "POST", headers, body: JSON.stringify({ title: "喝水提醒", message: "喝口水", schedule_type: "daily", time_of_day: "10:00" }) });
      expect(created.status).toBe(201);
      const body = await created.json() as any;
      expect(body.ok).toBe(true);
      expect(body.data.title).toBe("喝水提醒");
      const id = body.data.id;

      const list = await fetch(`http://127.0.0.1:${port}/api/v1/schedules`, { headers });
      expect((await list.json() as any).data).toHaveLength(1);

      const patched = await fetch(`http://127.0.0.1:${port}/api/v1/schedules/${id}`, { method: "PATCH", headers, body: JSON.stringify({ enabled: 0, time_of_day: "11:30" }) });
      expect(patched.status).toBe(200);
      expect((await patched.json() as any).data).toMatchObject({ enabled: 0, time_of_day: "11:30" });

      const removed = await fetch(`http://127.0.0.1:${port}/api/v1/schedules/${id}`, { method: "DELETE", headers });
      expect(removed.status).toBe(200);
      expect((await removed.json() as any).data.deleted).toBe(true);
    } finally { ctx.server.stop(true); ctx.db.close(); }
  });

  test("非法 schedule_type 与过期 once 返回校验错误", async () => {
    const ctx = start();
    const port = ctx.server.port;
    const headers = { "content-type": "application/json", host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}` };
    try {
      const badType = await fetch(`http://127.0.0.1:${port}/api/v1/schedules`, { method: "POST", headers, body: JSON.stringify({ title: "t", message: "m", schedule_type: "hourly", time_of_day: "10:00" }) });
      expect(badType.status).toBe(422);
      const badTime = await fetch(`http://127.0.0.1:${port}/api/v1/schedules`, { method: "POST", headers, body: JSON.stringify({ title: "t", message: "m", schedule_type: "daily", time_of_day: "99:00" }) });
      expect(badTime.status).toBe(422);
      const past = await fetch(`http://127.0.0.1:${port}/api/v1/schedules`, { method: "POST", headers, body: JSON.stringify({ title: "t", message: "m", schedule_type: "once", time_of_day: "08:00", fire_date: "2020-01-01" }) });
      expect(past.status).toBe(409);
    } finally { ctx.server.stop(true); ctx.db.close(); }
  });

  test("GET /api/v1/events 建立长驻事件流", async () => {
    const ctx = start();
    const port = ctx.server.port;
    const headers = { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}` };
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/events`, { headers });
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      const reader = res.body!.getReader();
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toContain("connected");
      await reader.cancel();
    } finally { ctx.server.stop(true); ctx.db.close(); }
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { handleV1 } from "../src/server/api";

let db: RecipeDB | null = null;
afterEach(() => { db?.close(); db = null; });
const call = async (path: string, init: RequestInit = {}) => {
  db ??= new RecipeDB(":memory:");
  const req = new Request(`http://127.0.0.1:3000${path}`, { headers: { "content-type": "application/json", ...(init.headers ?? {}) }, ...init });
  const res = await handleV1(req, new URL(req.url), db);
  return { res: res!, body: (await res!.json()) as any };
};

describe("recipes 资源校验", () => {
  test("默认 source=manual，且不能伪造 tutorial/preset 混入开小灶", async () => {
    const created = await call("/api/v1/recipes", { method: "POST", body: JSON.stringify({ title: "番茄炒蛋", ingredients: [{ name: "番茄", amount: "2个" }], steps: { cook: ["下锅翻炒"] } }) });
    expect(created.res.status).toBe(201);
    expect(created.body.data.source).toBe("manual");
    const id = created.body.data.id;

    for (const source of ["tutorial", "preset", "whatever"]) {
      const forged = await call(`/api/v1/recipes/${id}`, { method: "PATCH", body: JSON.stringify({ source }) });
      expect(forged.res.status).toBe(422);
      expect(forged.body.error.fieldErrors.source).toBeTruthy();
    }
    const allowed = await call(`/api/v1/recipes/${id}`, { method: "PATCH", body: JSON.stringify({ source: "agent" }) });
    expect(allowed.res.status).toBe(200);
    expect(allowed.body.data.source).toBe("agent");

    const tutorials = await call("/api/v1/tutorials");
    expect(tutorials.body.data.map((t: any) => t.id)).not.toContain(id);
  });

  test("拒绝体积超限的 JSON 字段", async () => {
    const tooBig = await call("/api/v1/recipes", { method: "POST", body: JSON.stringify({ title: "大字段", ingredients: [{ name: "x".repeat(100_001) }] }) });
    expect(tooBig.res.status).toBe(422);
    expect(tooBig.body.error.fieldErrors.ingredients).toBeTruthy();
  });

  test("普通菜谱仍可自由写入结构化内容", async () => {
    const created = await call("/api/v1/recipes", { method: "POST", body: JSON.stringify({ title: "自建菜谱", ingredients: ["番茄", "鸡蛋"], steps: ["炒"], nutrition_estimate: { kcal: 200 } }) });
    expect(created.res.status).toBe(201);
    expect(created.body.data.ingredients).toEqual(["番茄", "鸡蛋"]);
    expect(created.body.data.nutrition_estimate).toEqual({ kcal: 200 });
  });
});

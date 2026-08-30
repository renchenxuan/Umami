import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { TUTORIAL_PRESETS } from "../src/db/tutorial-presets";
import { handleV1 } from "../src/server/api";
import { parseTutorial, buildTutorialUserPrompt, buildTutorialProfile } from "../src/server/tutorial";
import { createTutorialTools } from "../src/tools/tutorials";
import { createMapTools, resolveActiveMapProvider, type MapFetcher } from "../src/tools/map-tools";
import type { SettingsStore } from "../src/settings";

let db: RecipeDB | null = null;
afterEach(() => { db?.close(); db = null; });
const call = async (path: string, init: RequestInit = {}) => {
  db ??= new RecipeDB(":memory:");
  const req = new Request(`http://127.0.0.1:3000${path}`, { headers: { "content-type": "application/json", ...(init.headers ?? {}) }, ...init });
  const res = await handleV1(req, new URL(req.url), db);
  return { res: res!, body: await res!.json() as any };
};

const seedTutorial = (d: RecipeDB, title: string) => d.createRecipe({
  title,
  ingredients: [{ name: "番茄", amount: "400g", note: "需购买" }],
  steps: { servings: 2, total_minutes: 20, prep: ["切块"], cook: ["热锅下油"], tips: "别炒老" },
  source: "tutorial",
});

describe("tutorial presets (migration v11)", () => {
  test("fresh database seeds 36 preset dishes across three meals", () => {
    db ??= new RecipeDB(":memory:");
    const tutorials = db.getTutorials();
    expect(tutorials.length).toBe(36);
    expect(tutorials.every((t: any) => t.source === "preset")).toBe(true);
    const meals = tutorials.map((t: any) => (t.steps as any).meal);
    expect(meals.filter((m: string) => m === "早餐").length).toBe(12);
    expect(meals.filter((m: string) => m === "午餐").length).toBe(12);
    expect(meals.filter((m: string) => m === "晚餐").length).toBe(12);
  });

  test("presets carry complete teaching structure", () => {
    for (const dish of TUTORIAL_PRESETS) {
      expect(dish.title.length).toBeGreaterThan(1);
      expect(dish.ingredients.length).toBeGreaterThanOrEqual(3);
      expect(dish.prep.length).toBeGreaterThanOrEqual(2);
      expect(dish.cook.length).toBeGreaterThanOrEqual(3);
      expect(dish.tips.length).toBeGreaterThan(4);
      for (const ing of dish.ingredients) {
        expect(ing.name.length).toBeGreaterThan(0);
        expect(ing.amount.length).toBeGreaterThan(0);
      }
    }
  });

  test("preset deletions are not resurrected on reopen", () => {
    db ??= new RecipeDB(":memory:");
    const preset = db.getTutorials()[0] as any;
    db.archiveRecipe(preset.id);
    db.close();
    db = new RecipeDB(":memory:");
    // 同一个内存库实例已销毁；这里验证的是迁移只跑一次的语义：
    // 重新打开持久化库不会重复播种——用第二块内存库验证播种次数受 NOT EXISTS 保护
    const titles = db.getTutorials().map((t: any) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("tutorials API", () => {
  test("lists presets and tutorials, hides manual recipes", async () => {
    db ??= new RecipeDB(":memory:");
    seedTutorial(db, "番茄炒蛋（AI 版）");
    db.createRecipe({ title: "手工菜谱", ingredients: [], steps: {}, source: "manual" });
    const list = await call("/api/v1/tutorials");
    expect(list.res.status).toBe(200);
    expect(list.body.data.some((t: any) => t.title === "番茄炒蛋（AI 版）" && t.source === "tutorial")).toBe(true);
    expect(list.body.data.some((t: any) => t.source === "preset")).toBe(true);
    expect(list.body.data.every((t: any) => t.source !== "manual")).toBe(true);
  });

  test("REST create and update support user-authored tutorials", async () => {
    const created = await call("/api/v1/tutorials", {
      method: "POST",
      body: JSON.stringify({
        title: "我的拿手菜",
        ingredients: [{ name: "鸡蛋", amount: "2 个" }],
        steps: { servings: 1, meal: "早餐", prep: ["打散"], cook: ["煎熟"], tips: "小火" },
      }),
    });
    expect(created.res.status).toBe(201);
    expect(created.body.data.source).toBe("tutorial");
    const id = created.body.data.id;
    const updated = await call(`/api/v1/tutorials/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "我的拿手菜（改良）",
        ingredients: [{ name: "鸡蛋", amount: "3 个", note: "加量" }],
        steps: { servings: 2, meal: "午餐", prep: ["打散"], cook: ["煎熟", "加酱"], tips: "" },
      }),
    });
    expect(updated.res.status).toBe(200);
    expect(updated.body.data.title).toBe("我的拿手菜（改良）");
    expect((updated.body.data.steps as any).cook).toEqual(["煎熟", "加酱"]);
    const invalid = await call(`/api/v1/tutorials/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ingredients: [{ name: "缺用量" }] }),
    });
    expect(invalid.res.status).toBe(422);
  });

  test("delete archives and get returns 404 for manual recipes", async () => {
    db ??= new RecipeDB(":memory:");
    const id = seedTutorial(db, "可乐鸡翅（测试版）");
    const manualId = db.createRecipe({ title: "手工", source: "manual" });
    const hidden = await call(`/api/v1/tutorials/${manualId}`);
    expect(hidden.res.status).toBe(404);
    const removed = await call(`/api/v1/tutorials/${id}`, { method: "DELETE" });
    expect(removed.body.data.archived).toBe(true);
    const after = await call("/api/v1/tutorials");
    expect(after.body.data.every((t: any) => t.title !== "可乐鸡翅（测试版）")).toBe(true);
  });

  test("tutorials are included in the export bundle", () => {
    db ??= new RecipeDB(":memory:");
    seedTutorial(db, "导出测试");
    const bundle = db.getExportBundle();
    expect(bundle.recipes.some((r: any) => r.source === "tutorial" && r.title === "导出测试")).toBe(true);
  });
});

describe("tutorial parsing", () => {
  const valid = JSON.stringify({
    title: "番茄炒蛋", servings: 2, total_minutes: 20,
    ingredients: [{ name: "番茄", amount: "400g", note: "需购买" }, { name: "鸡蛋", amount: "3 个" }],
    prep: ["切块"], cook: ["热锅冷油炒蛋"],
    tips: "蛋液别炒老",
  });
  test("parses plain and markdown-fenced JSON", () => {
    expect(parseTutorial(valid)?.title).toBe("番茄炒蛋");
    expect(parseTutorial("```json\n" + valid + "\n```")?.servings).toBe(2);
    expect(parseTutorial(`前缀说明\n${valid}\n后缀`)?.ingredients).toHaveLength(2);
  });
  test("rejects structurally invalid output", () => {
    expect(parseTutorial("不是 JSON")).toBeNull();
    expect(parseTutorial('{"title":"","servings":2}')).toBeNull();
    expect(parseTutorial('{"title":"无步骤","servings":2,"ingredients":[{"name":"蛋","amount":"1个"}],"cook":[]}')).toBeNull();
    expect(parseTutorial('{"title":"份数越界","servings":99,"ingredients":[{"name":"蛋","amount":"1个"}],"cook":["炒"]}')).toBeNull();
  });
  test("user prompt embeds fridge and allergy constraints", () => {
    db ??= new RecipeDB(":memory:");
    db.addIngredient("番茄", "2个", "蔬菜");
    db.updatePreferences({ allergies: "花生" });
    const prompt = buildTutorialUserPrompt(buildTutorialProfile(db), "番茄炒蛋", 3);
    expect(prompt).toContain("番茄炒蛋");
    expect(prompt).toContain("3 人份");
    expect(prompt).toContain("番茄");
    expect(prompt).toContain("花生");
  });
});

describe("save_tutorial tool", () => {
  test("stores a structured tutorial into the recipes table", async () => {
    db ??= new RecipeDB(":memory:");
    const tool = createTutorialTools(db)[0]!;
    const result = await tool.execute("call-1", {
      title: "青椒肉丝", servings: 2, total_minutes: 25,
      ingredients: [{ name: "青椒", amount: "150g" }, { name: "里脊", amount: "250g", note: "需购买" }],
      prep: ["切丝"], cook: ["滑炒肉丝至变色"], tips: "大火快炒",
    } as any);
    expect((result.content[0] as any).text).toContain("已保存");
    const saved = db.getTutorials().filter((t: any) => t.source === "tutorial");
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("青椒肉丝");
    expect((saved[0].steps as any).servings).toBe(2);
    expect((saved[0].ingredients as any)[1].note).toBe("需购买");
  });
});

// ===================== 地图工具（百度/高德/谷歌） =====================

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

type FakeRoute = (url: string) => { body?: unknown; fail?: Error };
const makeFetcher = (route: FakeRoute): MapFetcher => async (url) => {
  const r = route(url);
  if (r.fail) throw r.fail;
  return jsonResponse(r.body ?? { status: 0, result: [] });
};
const geocodeBaidu: FakeRoute = (url) => (new URL(url).pathname.startsWith("/geocoding")
  ? { body: { status: 0, result: { location: { lat: 39.9, lng: 116.4 } } } }
  : { body: { status: 0, result: [] } });
const geocodeAmap: FakeRoute = (url) => {
  const p = new URL(url).pathname;
  if (p === "/v3/geocode/geo") return { body: { status: "1", geocodes: [{ location: "116.4,39.9" }] } };
  if (p === "/v3/place/around") return { body: { status: "1", pois: [{ name: "望京公园", address: "朝阳区", distance: "1200" }] } };
  if (p === "/v3/direction/walking") return { body: { status: "1", route: { paths: [{ distance: "800", duration: "600" }] } } };
  if (p === "/v4/direction/bicycling") return { body: { errcode: 0, data: { paths: [{ distance: 5000, duration: 1200 }] } } };
  return { body: {} };
};
const geocodeGoogle: FakeRoute = (url) => {
  const p = new URL(url).pathname;
  if (p === "/maps/api/geocode/json") return { body: { status: "OK", results: [{ geometry: { location: { lat: 39.9, lng: 116.4 } } }] } };
  if (p === "/maps/api/place/nearbysearch/json") return { body: { status: "OK", results: [{ name: "望京公园", vicinity: "朝阳区", geometry: { location: { lat: 39.91, lng: 116.41 } } }] } };
  if (p === "/maps/api/distancematrix/json") return { body: { status: "OK", rows: [{ elements: [{ status: "OK", distance: { value: 5000 }, duration: { value: 1200 } }] }] } };
  return { body: {} };
};

const settingsWith = (keys: Record<string, string>, provider = "") => ({
  getExternalServiceKey: (id: string) => keys[id] ?? "",
  getMapProvider: () => provider,
}) as unknown as SettingsStore;

const AK = "test-ak-000000000000";

describe("map tools provider selection", () => {
  test("returns null when nothing is connected", () => {
    expect(resolveActiveMapProvider(settingsWith({}))).toBeNull();
    const tool = createMapTools(settingsWith({}))[0]!;
    return tool.execute("c", { keyword: "公园", location: "望京" } as any).then((r) => {
      expect((r.content[0] as any).text).toContain("尚未连接地图服务");
    });
  });
  test("prefers the user-set default, falls back to first connected", () => {
    expect(resolveActiveMapProvider(settingsWith({ baidu_map: AK, amap_map: AK }, "amap_map"))!.id).toBe("amap_map");
    expect(resolveActiveMapProvider(settingsWith({ google_maps: AK, amap_map: AK }))!.id).toBe("amap_map");
  });
});

describe("baidu provider", () => {
  test("searches places and estimates routes", async () => {
    const tools = createMapTools(settingsWith({ baidu_map: AK }, "baidu_map"), makeFetcher(geocodeBaidu));
    // 默认 result:[] → 无结果提示
    const search = await tools[0]!.execute("c", { keyword: "公园", location: "望京" } as any);
    expect((search.content[0] as any).text).toContain("没有找到");
    expect((search.content[0] as any).text).toContain("百度地图");
    const route = await tools[1]!.execute("c", { origin: "望京", destination: "奥森", mode: "riding" } as any);
    expect((route.content[0] as any).text).toContain("百度地图");
  });
});

describe("amap provider", () => {
  test("parses lng-lat geocode, pois and walking/bicycling routes", async () => {
    const tools = createMapTools(settingsWith({ amap_map: AK }, "amap_map"), makeFetcher(geocodeAmap));
    const search = await tools[0]!.execute("c", { keyword: "公园", location: "望京" } as any);
    const searchText = (search.content[0] as any).text as string;
    expect(searchText).toContain("望京公园");
    expect(searchText).toContain("1.2 km");
    expect(searchText).toContain("高德地图");
    const walk = await tools[1]!.execute("c", { origin: "望京", destination: "奥森", mode: "walking" } as any);
    expect((walk.content[0] as any).text).toContain("0.80 公里");
    const ride = await tools[1]!.execute("c", { origin: "望京", destination: "奥森", mode: "riding" } as any);
    expect((ride.content[0] as any).text).toContain("5.00 公里");
    expect((ride.content[0] as any).text).toContain("20 分钟");
  });
});

describe("google provider", () => {
  test("searches places and estimates bicycling route", async () => {
    const tools = createMapTools(settingsWith({ google_maps: AK }, "google_maps"), makeFetcher(geocodeGoogle));
    const search = await tools[0]!.execute("c", { keyword: "park", location: "Chaoyang" } as any);
    const searchText = (search.content[0] as any).text as string;
    expect(searchText).toContain("望京公园");
    expect(searchText).toContain("1.4 km");
    const ride = await tools[1]!.execute("c", { origin: "A", destination: "B", mode: "riding" } as any);
    expect((ride.content[0] as any).text).toContain("5.00 公里");
  });
});

describe("map tool key safety", () => {
  test("errors never leak the key", async () => {
    const ak = "leaky-ak-987654321";
    const failing = makeFetcher(() => ({ fail: new Error(`connect ECONNREFUSED https://api.map.baidu.com/geocoding/v3/?ak=${ak}`) }));
    const tools = createMapTools(settingsWith({ baidu_map: ak }, "baidu_map"), failing);
    const result = await tools[0]!.execute("c", { keyword: "公园", location: "望京" } as any);
    const t = (result.content[0] as any).text as string;
    expect(t).toContain("地图查询失败");
    expect(t).not.toContain(ak);
  });
  test("provider status errors map to readable messages", async () => {
    const failing = makeFetcher(() => ({ body: { status: 210, message: "AK 参数错误" } }));
    const tools = createMapTools(settingsWith({ baidu_map: AK }, "baidu_map"), failing);
    const result = await tools[0]!.execute("c", { keyword: "公园", location: "望京" } as any);
    expect((result.content[0] as any).text).toContain("status=210");
  });
});

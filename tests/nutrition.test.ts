import { describe, expect, test } from "bun:test";
import { parseQuantity, estimateItemNutrition, FOOD_NUTRITION } from "../src/db/foods-data";
import { estimateCalorieTarget } from "../src/server/diet-summary";
import { RecipeDB } from "../src/db/database";

describe("parseQuantity", () => {
  test("数字/中文/大小/直重", () => {
    expect(parseQuantity("2个")).toEqual({ count: 2, unit: "个" });
    expect(parseQuantity("半碗")).toEqual({ count: 0.5, unit: "碗" });
    expect(parseQuantity("两个番茄")).toEqual({ count: 2, unit: "个" });
    expect(parseQuantity("一大块")).toEqual({ count: 1.5, unit: "块" });
    expect(parseQuantity("200克")).toEqual({ count: 200, unit: "克" });
    expect(parseQuantity("1.5碗米饭")).toEqual({ count: 1.5, unit: "碗" });
    expect(parseQuantity("适量")).toEqual({ count: 1, unit: "适量" });
    expect(parseQuantity("")).toEqual({ count: 1, unit: "份" });
    expect(parseQuantity(null)).toEqual({ count: 1, unit: "份" });
  });
});

describe("estimateItemNutrition", () => {
  test("内置营养表精确匹配", () => {
    const rice = estimateItemNutrition("米饭", "一碗");
    expect(rice.source).toBe("table");
    expect(rice.grams).toBe(200);
    expect(rice.kcal).toBe(232); // 116 × 2
    const eggs = estimateItemNutrition("鸡蛋", "2个");
    expect(eggs.grams).toBe(100);
    expect(eggs.kcal).toBe(144);
  });

  test("表外食物按估算口径并标注", () => {
    const unknown = estimateItemNutrition("提拉米苏", "一块");
    expect(unknown.source).toBe("estimate");
    expect(unknown.kcal).toBeGreaterThan(0);
    expect(unknown.protein).toBeNull();
  });

  test("营养表覆盖全部 165 种种子食材（熟食别名除外）", () => {
    expect(Object.keys(FOOD_NUTRITION).length).toBeGreaterThanOrEqual(165);
    for (const kcal of Object.values(FOOD_NUTRITION).map((p) => p.kcal)) expect(kcal).toBeGreaterThanOrEqual(0);
  });
});

describe("estimateCalorieTarget", () => {
  const prefs = (over: Partial<import("../src/db/database").Preferences> = {}) => ({
    people_count: 1, taste_preference: "", allergies: "", cuisine_style: "", days: 7,
    height_cm: 175, age: 28, gender: "男", activity_level: "久坐", calorie_target: null, ...over,
  });

  test("手动目标优先", () => {
    const t = estimateCalorieTarget(prefs({ calorie_target: 1500 }), 70, []);
    expect(t).toMatchObject({ kcal: 1500, source: "manual" });
  });

  test("自动按 Mifflin-St Jeor 推算并随目标调整", () => {
    const base = estimateCalorieTarget(prefs(), 70, []);
    // 10*70+6.25*175-5*28+5 = 1658.75 → 1659 × 1.2 = 1990.8 → 1991
    expect(base?.bmr).toBe(1659);
    expect(base?.tdee).toBe(1991);
    expect(base?.kcal).toBe(1990);
    const cut = estimateCalorieTarget(prefs(), 70, [{ name: "减脂", category: "健康", target: "65kg", unit: "kg", status: "进行中", target_value: 65, current_value: 70, start_date: null, end_date: null, created_at: "", updated_at: "", archived_at: null }]);
    expect(cut?.kcal).toBe(1590); // 1991 - 400
  });

  test("缺少身高/年龄/体重时返回 null", () => {
    expect(estimateCalorieTarget(prefs({ height_cm: null }), 70, [])).toBeNull();
    expect(estimateCalorieTarget(prefs(), null, [])).toBeNull();
  });
});

describe("diet 营养计算链路", () => {
  test("addDietLog 自动注入克数/热量并汇总 total_kcal", () => {
    const db = new RecipeDB(":memory:");
    const id = db.addDietLog("2026-08-29", "午餐", [
      { name: "米饭", quantity: "一碗" },
      { name: "鸡胸肉", quantity: "120克" },
      { name: "可乐鸡翅", quantity: "一份" }, // 表外 → 估算口径
    ], "测试");
    const log = db.getDietLog(id)!;
    expect(log.total_kcal).toBeGreaterThan(0);
    const items = log.foods as Array<{ name: string; grams: number; kcal: number; source: string }>;
    expect(items[0]).toMatchObject({ name: "米饭", grams: 200, kcal: 232, source: "table" });
    expect(items[1]).toMatchObject({ name: "鸡胸肉", grams: 120, kcal: 160, source: "table" });
    expect(items[2].source).toBe("estimate");
    expect(log.total_kcal).toBe(items.reduce((s, i) => s + i.kcal, 0));
    // 覆盖模型提供的估算 kcal
    const id2 = db.addDietLog("2026-08-29", "加餐", [{ name: "提拉米苏", quantity: "一块", kcal: 350 }], "");
    expect((db.getDietLog(id2)!.foods as Array<{ kcal: number; source: string }>)[0]).toMatchObject({ kcal: 350, source: "estimate" });
    expect(db.getDietLog(id2)!.total_kcal).toBe(350);
    db.close();
  });

  test("migration v10 为 foods 回填营养列且 searchFoods 返回", () => {
    const db = new RecipeDB(":memory:");
    const egg = db.searchFoods("鸡蛋")[0]!;
    expect(egg.kcal).toBe(144);
    expect(egg.protein).toBe(13.3);
    db.close();
  });

  test("getConversations 附带最后一条消息预览", () => {
    const db = new RecipeDB(":memory:");
    const id = db.createConversation("测试");
    db.addMessage(id, "user", "这条是会话预览测试消息，应该被截取展示出来");
    const convs = db.getConversations();
    expect(convs[0]!.last_message).toContain("会话预览测试");
    db.close();
  });
});

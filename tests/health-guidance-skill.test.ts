import { describe, expect, test } from "bun:test";
import { HEALTH_GUIDANCE_SKILL } from "../src/skills/health-guidance";
import { RECOMMENDATION_SYSTEM_PROMPT } from "../src/server/recommendations";

describe("health guidance skill", () => {
  test("is bundled once and shared with recommendations", () => {
    expect(HEALTH_GUIDANCE_SKILL).toContain("不得诊断疾病");
    expect(HEALTH_GUIDANCE_SKILL).toContain("过敏和明确忌口是硬约束");
    expect(HEALTH_GUIDANCE_SKILL).not.toContain("name: health-guidance");
    expect(RECOMMENDATION_SYSTEM_PROMPT).toContain(HEALTH_GUIDANCE_SKILL);
  });
});

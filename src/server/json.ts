/**
 * 模型输出解析：容忍 markdown 代码块包裹与前后噪声文本。
 * 非对象或无法解析时返回 null，由调用方决定降级策略。
 */
export function extractJson(raw: string): Record<string, unknown> | null {
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
  try {
    const parsed = JSON.parse(stripped);
    return isObject(parsed) ? parsed : null;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const sliced = JSON.parse(stripped.slice(start, end + 1));
        return isObject(sliced) ? sliced : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

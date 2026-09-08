import { describe, expect, test } from "bun:test";
import { extractJson } from "../src/server/json";

describe("extractJson", () => {
  test("解析裸 JSON 对象", () => {
    expect(extractJson('{"title":"番茄炒蛋","servings":2}')).toEqual({ title: "番茄炒蛋", servings: 2 });
  });

  test("容忍 markdown 代码块包裹", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test("从前后噪声文本中截取对象", () => {
    expect(extractJson("好的，这是结果：\n{\"a\":{\"b\":2}}\n希望对你有帮助")).toEqual({ a: { b: 2 } });
  });

  test("非对象与无法解析的输入一律返回 null", () => {
    for (const raw of ["[1,2]", '"just a string"', "不是 JSON", "", "null", "123"]) {
      expect(extractJson(raw)).toBeNull();
    }
  });

  test("嵌套花括号不会截断到错误的边界", () => {
    expect(extractJson('前缀 {"a":{"b":[1,{"c":3}]},"d":4} 后缀')).toEqual({ a: { b: [1, { c: 3 }] }, d: 4 });
  });
});

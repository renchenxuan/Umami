export type AiFeature = "chat" | "image" | "recommendation" | "analysis" | "tutorial" | "fridge";

export interface AiDataPolicy {
  feature: AiFeature;
  categories: string[];
  provider: string;
  estimateNotice?: string;
}

export const AI_DATA_POLICIES: AiDataPolicy[] = [
  { feature: "chat", categories: ["你主动发送的文字", "你主动上传的图片"], provider: "当前选择的模型提供商" },
  { feature: "image", categories: ["你主动上传的图片", "图片识别出的食材"], provider: "当前选择的模型提供商" },
  { feature: "recommendation", categories: ["饮食、训练和体重记录", "健康目标与偏好", "冰箱食材"], provider: "当前选择的模型提供商", estimateNotice: "推荐中的营养和运动数值为估算或通用建议，不是医疗建议。" },
  { feature: "analysis", categories: ["饮食、训练和体重记录", "健康目标与偏好"], provider: "当前选择的模型提供商", estimateNotice: "分析中的营养数值可能是系统估算，不等同于用户实际测量。" },
  { feature: "tutorial", categories: ["你填写的菜名", "冰箱食材与口味偏好"], provider: "当前选择的模型提供商", estimateNotice: "教程中的用量和时间是生成内容，需按实际情况判断。" },
  { feature: "fridge", categories: ["冰箱食材、存放时间与温度设置"], provider: "当前选择的模型提供商", estimateNotice: "保鲜判断是估计，不替代食品安全专业判断。" },
];

export function getAiDataPolicy(feature: AiFeature): AiDataPolicy {
  return AI_DATA_POLICIES.find((policy) => policy.feature === feature)!;
}

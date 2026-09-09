export type AiFeature = "chat" | "image" | "recommendation" | "analysis" | "tutorial" | "fridge" | "scheduled";

export interface AiDataPolicy {
  feature: AiFeature;
  categories: string[];
  provider: string;
  scopeNotice?: string;
  estimateNotice?: string;
}

export const AI_DATA_POLICIES: AiDataPolicy[] = [
  {
    feature: "chat",
    categories: ["你主动发送的文字", "你主动上传的图片", "为回答当前问题而按需读取的相关本地记录"],
    provider: "当前选择的模型提供商",
    scopeNotice: "聊天只应读取完成当前问题所需的数据，不会默认发送全部本地记录。",
  },
  { feature: "image", categories: ["你主动上传的图片", "图片识别出的食材"], provider: "当前选择的模型提供商" },
  { feature: "recommendation", categories: ["近期体重与体脂记录", "健康目标", "身高、年龄、活动水平、口味与忌口偏好", "冰箱食材名称"], provider: "当前选择的模型提供商", estimateNotice: "推荐中的营养和运动数值为估算或通用建议，不是医疗建议。" },
  { feature: "analysis", categories: ["饮食、训练和体重记录", "健康目标与偏好"], provider: "当前选择的模型提供商", estimateNotice: "分析中的营养数值可能是系统估算，不等同于用户实际测量。" },
  { feature: "tutorial", categories: ["你填写的菜名", "冰箱食材与口味偏好"], provider: "当前选择的模型提供商", estimateNotice: "教程中的用量和时间是生成内容，需按实际情况判断。" },
  { feature: "fridge", categories: ["食材名称、分类、区域、数量", "加入日期与保鲜时长", "食材备注", "冷藏与冷冻温度设置"], provider: "当前选择的模型提供商", estimateNotice: "保鲜判断是估计，不替代食品安全专业判断。" },
  { feature: "scheduled", categories: ["定时任务的标题与提醒内容", "为完成当前任务而按需读取的相关本地记录"], provider: "当前选择的模型提供商", scopeNotice: "仅在定时任务实际触发并且 AI 授权仍有效时调用模型。" },
];

export function getAiDataPolicy(feature: AiFeature): AiDataPolicy {
  return AI_DATA_POLICIES.find((policy) => policy.feature === feature)!;
}

export interface Food {
  name: string;
  category: string;
  emoji: string;
}

/** 常见中国食材大全（内置种子数据，含分类与 emoji）。 */
export const FOODS: Food[] = [
  // 蔬菜
  { name: "番茄", category: "蔬菜", emoji: "🍅" },
  { name: "土豆", category: "蔬菜", emoji: "🥔" },
  { name: "胡萝卜", category: "蔬菜", emoji: "🥕" },
  { name: "白萝卜", category: "蔬菜", emoji: "🥕" },
  { name: "黄瓜", category: "蔬菜", emoji: "🥒" },
  { name: "茄子", category: "蔬菜", emoji: "🍆" },
  { name: "西兰花", category: "蔬菜", emoji: "🥦" },
  { name: "花菜", category: "蔬菜", emoji: "🥦" },
  { name: "白菜", category: "蔬菜", emoji: "🥬" },
  { name: "菠菜", category: "蔬菜", emoji: "🥬" },
  { name: "生菜", category: "蔬菜", emoji: "🥬" },
  { name: "油菜", category: "蔬菜", emoji: "🥬" },
  { name: "芹菜", category: "蔬菜", emoji: "🥬" },
  { name: "韭菜", category: "蔬菜", emoji: "🌿" },
  { name: "香菜", category: "蔬菜", emoji: "🌿" },
  { name: "葱", category: "蔬菜", emoji: "🌿" },
  { name: "姜", category: "蔬菜", emoji: "🫚" },
  { name: "蒜", category: "蔬菜", emoji: "🧄" },
  { name: "洋葱", category: "蔬菜", emoji: "🧅" },
  { name: "青椒", category: "蔬菜", emoji: "🫑" },
  { name: "红椒", category: "蔬菜", emoji: "🌶️" },
  { name: "小米椒", category: "蔬菜", emoji: "🌶️" },
  { name: "南瓜", category: "蔬菜", emoji: "🎃" },
  { name: "冬瓜", category: "蔬菜", emoji: "🍈" },
  { name: "丝瓜", category: "蔬菜", emoji: "🥒" },
  { name: "苦瓜", category: "蔬菜", emoji: "🥒" },
  { name: "玉米", category: "蔬菜", emoji: "🌽" },
  { name: "山药", category: "蔬菜", emoji: "🥔" },
  { name: "莲藕", category: "蔬菜", emoji: "🪷" },
  { name: "豆角", category: "蔬菜", emoji: "🫛" },
  { name: "四季豆", category: "蔬菜", emoji: "🫛" },
  { name: "荷兰豆", category: "蔬菜", emoji: "🫛" },
  { name: "芦笋", category: "蔬菜", emoji: "🌱" },
  { name: "莴笋", category: "蔬菜", emoji: "🥬" },

  // 水果
  { name: "苹果", category: "水果", emoji: "🍎" },
  { name: "香蕉", category: "水果", emoji: "🍌" },
  { name: "橙子", category: "水果", emoji: "🍊" },
  { name: "橘子", category: "水果", emoji: "🍊" },
  { name: "柠檬", category: "水果", emoji: "🍋" },
  { name: "葡萄", category: "水果", emoji: "🍇" },
  { name: "草莓", category: "水果", emoji: "🍓" },
  { name: "蓝莓", category: "水果", emoji: "🫐" },
  { name: "桃子", category: "水果", emoji: "🍑" },
  { name: "樱桃", category: "水果", emoji: "🍒" },
  { name: "菠萝", category: "水果", emoji: "🍍" },
  { name: "芒果", category: "水果", emoji: "🥭" },
  { name: "猕猴桃", category: "水果", emoji: "🥝" },
  { name: "西瓜", category: "水果", emoji: "🍉" },
  { name: "哈密瓜", category: "水果", emoji: "🍈" },
  { name: "梨", category: "水果", emoji: "🍐" },
  { name: "火龙果", category: "水果", emoji: "🐉" },
  { name: "石榴", category: "水果", emoji: "🍎" },
  { name: "牛油果", category: "水果", emoji: "🥑" },
  { name: "柚子", category: "水果", emoji: "🍊" },

  // 肉类
  { name: "猪肉", category: "肉类", emoji: "🥩" },
  { name: "猪里脊", category: "肉类", emoji: "🥩" },
  { name: "五花肉", category: "肉类", emoji: "🥓" },
  { name: "排骨", category: "肉类", emoji: "🍖" },
  { name: "牛肉", category: "肉类", emoji: "🥩" },
  { name: "牛腩", category: "肉类", emoji: "🥩" },
  { name: "牛排", category: "肉类", emoji: "🥩" },
  { name: "羊肉", category: "肉类", emoji: "🥩" },
  { name: "鸡胸肉", category: "肉类", emoji: "🍗" },
  { name: "鸡腿", category: "肉类", emoji: "🍗" },
  { name: "鸡翅", category: "肉类", emoji: "🍗" },
  { name: "鸡爪", category: "肉类", emoji: "🍗" },
  { name: "鸭肉", category: "肉类", emoji: "🦆" },
  { name: "培根", category: "肉类", emoji: "🥓" },
  { name: "火腿", category: "肉类", emoji: "🥓" },
  { name: "香肠", category: "肉类", emoji: "🌭" },
  { name: "午餐肉", category: "肉类", emoji: "🥫" },

  // 蛋奶
  { name: "鸡蛋", category: "蛋奶", emoji: "🥚" },
  { name: "鸭蛋", category: "蛋奶", emoji: "🥚" },
  { name: "鹌鹑蛋", category: "蛋奶", emoji: "🥚" },
  { name: "牛奶", category: "蛋奶", emoji: "🥛" },
  { name: "酸奶", category: "蛋奶", emoji: "🥛" },
  { name: "奶酪", category: "蛋奶", emoji: "🧀" },
  { name: "黄油", category: "蛋奶", emoji: "🧈" },
  { name: "奶油", category: "蛋奶", emoji: "🧁" },

  // 水产
  { name: "三文鱼", category: "水产", emoji: "🐟" },
  { name: "鲈鱼", category: "水产", emoji: "🐟" },
  { name: "鲫鱼", category: "水产", emoji: "🐟" },
  { name: "带鱼", category: "水产", emoji: "🐟" },
  { name: "龙利鱼", category: "水产", emoji: "🐟" },
  { name: "鳕鱼", category: "水产", emoji: "🐟" },
  { name: "虾", category: "水产", emoji: "🦐" },
  { name: "虾仁", category: "水产", emoji: "🦐" },
  { name: "螃蟹", category: "水产", emoji: "🦀" },
  { name: "扇贝", category: "水产", emoji: "🦪" },
  { name: "蛤蜊", category: "水产", emoji: "🦪" },
  { name: "鱿鱼", category: "水产", emoji: "🦑" },
  { name: "章鱼", category: "水产", emoji: "🐙" },
  { name: "海带", category: "水产", emoji: "🌿" },
  { name: "紫菜", category: "水产", emoji: "🌿" },

  // 主食
  { name: "大米", category: "主食", emoji: "🍚" },
  { name: "糙米", category: "主食", emoji: "🍚" },
  { name: "小米", category: "主食", emoji: "🌾" },
  { name: "燕麦", category: "主食", emoji: "🌾" },
  { name: "面粉", category: "主食", emoji: "🌾" },
  { name: "面条", category: "主食", emoji: "🍜" },
  { name: "挂面", category: "主食", emoji: "🍜" },
  { name: "方便面", category: "主食", emoji: "🍜" },
  { name: "粉丝", category: "主食", emoji: "🍜" },
  { name: "面包", category: "主食", emoji: "🍞" },
  { name: "吐司", category: "主食", emoji: "🍞" },
  { name: "馒头", category: "主食", emoji: "🥟" },
  { name: "饺子", category: "主食", emoji: "🥟" },
  { name: "包子", category: "主食", emoji: "🥟" },
  { name: "红薯", category: "主食", emoji: "🍠" },
  { name: "紫薯", category: "主食", emoji: "🍠" },
  { name: "藜麦", category: "主食", emoji: "🌾" },

  // 豆制品
  { name: "豆腐", category: "豆制品", emoji: "🫛" },
  { name: "嫩豆腐", category: "豆制品", emoji: "🫛" },
  { name: "豆干", category: "豆制品", emoji: "🫛" },
  { name: "腐竹", category: "豆制品", emoji: "🫛" },
  { name: "豆浆", category: "豆制品", emoji: "🥛" },
  { name: "黄豆", category: "豆制品", emoji: "🫘" },
  { name: "绿豆", category: "豆制品", emoji: "🫘" },
  { name: "红豆", category: "豆制品", emoji: "🫘" },
  { name: "黑豆", category: "豆制品", emoji: "🫘" },
  { name: "鹰嘴豆", category: "豆制品", emoji: "🫘" },

  // 菌菇
  { name: "香菇", category: "菌菇", emoji: "🍄" },
  { name: "金针菇", category: "菌菇", emoji: "🍄" },
  { name: "杏鲍菇", category: "菌菇", emoji: "🍄" },
  { name: "平菇", category: "菌菇", emoji: "🍄" },
  { name: "木耳", category: "菌菇", emoji: "🍄" },
  { name: "银耳", category: "菌菇", emoji: "🍄" },
  { name: "口蘑", category: "菌菇", emoji: "🍄" },

  // 调味
  { name: "盐", category: "调味", emoji: "🧂" },
  { name: "糖", category: "调味", emoji: "🧂" },
  { name: "生抽", category: "调味", emoji: "🫙" },
  { name: "老抽", category: "调味", emoji: "🫙" },
  { name: "醋", category: "调味", emoji: "🫙" },
  { name: "料酒", category: "调味", emoji: "🫙" },
  { name: "蚝油", category: "调味", emoji: "🫙" },
  { name: "豆瓣酱", category: "调味", emoji: "🫙" },
  { name: "辣椒酱", category: "调味", emoji: "🌶️" },
  { name: "番茄酱", category: "调味", emoji: "🥫" },
  { name: "酱油", category: "调味", emoji: "🫙" },
  { name: "食用油", category: "调味", emoji: "🫗" },
  { name: "橄榄油", category: "调味", emoji: "🫒" },
  { name: "芝麻油", category: "调味", emoji: "🫗" },
  { name: "花椒", category: "调味", emoji: "🌶️" },
  { name: "八角", category: "调味", emoji: "🌟" },
  { name: "桂皮", category: "调味", emoji: "🪵" },
  { name: "黑胡椒", category: "调味", emoji: "🧂" },
  { name: "孜然", category: "调味", emoji: "🧂" },
  { name: "蜂蜜", category: "调味", emoji: "🍯" },
  { name: "咖喱", category: "调味", emoji: "🍛" },

  // 坚果
  { name: "核桃", category: "坚果", emoji: "🌰" },
  { name: "杏仁", category: "坚果", emoji: "🌰" },
  { name: "花生", category: "坚果", emoji: "🥜" },
  { name: "腰果", category: "坚果", emoji: "🌰" },
  { name: "开心果", category: "坚果", emoji: "🌰" },
  { name: "瓜子", category: "坚果", emoji: "🌻" },
  { name: "芝麻", category: "坚果", emoji: "🌾" },

  // 其他
  { name: "枸杞", category: "其他", emoji: "🔴" },
  { name: "红枣", category: "其他", emoji: "🔴" },
  { name: "桂圆", category: "其他", emoji: "🟤" },
  { name: "莲子", category: "其他", emoji: "🟢" },
  { name: "百合", category: "其他", emoji: "🌷" },
  { name: "蛋白粉", category: "其他", emoji: "🥤" },
  { name: "麦片", category: "其他", emoji: "🥣" },
  { name: "咖啡", category: "其他", emoji: "☕" },
  { name: "茶叶", category: "其他", emoji: "🍵" },
];

export const FOOD_CATEGORIES = [
  "蔬菜",
  "水果",
  "肉类",
  "蛋奶",
  "水产",
  "主食",
  "豆制品",
  "菌菇",
  "调味",
  "坚果",
  "其他",
];

export const FOOD_EMOJI_BY_NAME: Record<string, string> = FOODS.reduce(
  (map, f) => {
    map[f.name] = f.emoji;
    return map;
  },
  {} as Record<string, string>,
);

const UNIT_OVERRIDES: Record<string, string> = {
  方便面: "袋", 面包: "袋", 吐司: "袋", 燕麦: "袋", 麦片: "袋", 粉丝: "袋", 挂面: "袋", 面条: "把",
  大米: "kg", 糙米: "kg", 小米: "kg", 面粉: "kg", 藜麦: "kg",
  鸡蛋: "个", 鸭蛋: "个", 鹌鹑蛋: "个",
  牛奶: "盒", 酸奶: "盒", 奶酪: "块", 黄油: "块", 豆浆: "瓶",
  香蕉: "根", 西瓜: "个", 菠萝: "个", 火龙果: "个",
  牛排: "块", 鸡胸肉: "块", 鸡腿: "个", 鸡翅: "个", 火腿: "根", 香肠: "根", 午餐肉: "罐",
  三文鱼: "块", 鲈鱼: "条", 鲫鱼: "条", 带鱼: "条", 龙利鱼: "片", 鳕鱼: "块", 鱿鱼: "条", 螃蟹: "只", 章鱼: "只",
  豆腐: "块", 嫩豆腐: "盒", 豆干: "块", 腐竹: "袋",
  银耳: "朵", 木耳: "袋", 海带: "袋", 紫菜: "袋",
};

const CATEGORY_UNITS: Record<string, string> = {
  蔬菜: "把", 水果: "个", 肉类: "斤", 蛋奶: "个", 水产: "斤", 主食: "份",
  豆制品: "块", 菌菇: "斤", 调味: "瓶", 坚果: "袋", 其他: "份",
};

export function unitFor(name: string, category: string): string {
  return UNIT_OVERRIDES[name] ?? CATEGORY_UNITS[category] ?? "份";
}

// ===================== 营养数据层 =====================
// 数值口径：每 100g 可食部的常见均值（ kcal / 蛋白质 g / 脂肪 g / 碳水化合物 g ），
// 综合《中国食物成分表》公开摘要与 USDA FoodData Central 的典型值取整；用于估算展示，
// 标注为「约」，不替代临床营养计算。生食按生重（如大米 346），烹制食品按成品（如馒头 223）。

export interface NutritionProfile { kcal: number; protein: number; fat: number; carb: number }

const n = (kcal: number, protein: number, fat: number, carb: number): NutritionProfile => ({ kcal, protein, fat, carb });

export const FOOD_NUTRITION: Record<string, NutritionProfile> = {
  // 蔬菜
  番茄: n(20, 0.9, 0.2, 4.0), 土豆: n(81, 2.6, 0.2, 17.8), 胡萝卜: n(39, 1.0, 0.2, 8.1),
  白萝卜: n(21, 0.9, 0.1, 5.0), 黄瓜: n(16, 0.8, 0.2, 2.9), 茄子: n(23, 1.1, 0.2, 4.9),
  西兰花: n(36, 4.1, 0.6, 4.3), 花菜: n(26, 2.1, 0.2, 4.6), 白菜: n(20, 1.6, 0.2, 3.4),
  菠菜: n(28, 2.6, 0.3, 4.5), 生菜: n(16, 1.3, 0.2, 2.0), 油菜: n(25, 1.8, 0.5, 3.8),
  芹菜: n(22, 1.2, 0.2, 4.5), 韭菜: n(26, 2.4, 0.4, 4.6), 香菜: n(33, 1.8, 0.4, 6.2),
  葱: n(34, 1.6, 0.4, 6.5), 姜: n(46, 1.3, 0.6, 10.3), 蒜: n(128, 4.5, 0.2, 27.6),
  洋葱: n(40, 1.1, 0.2, 9.0), 青椒: n(22, 1.0, 0.2, 5.4), 红椒: n(32, 1.3, 0.3, 6.6),
  小米椒: n(32, 1.3, 0.3, 6.6), 南瓜: n(23, 0.7, 0.1, 5.3), 冬瓜: n(12, 0.4, 0.2, 2.6),
  丝瓜: n(20, 1.0, 0.2, 4.2), 苦瓜: n(22, 1.0, 0.1, 4.9), 玉米: n(112, 4.0, 1.2, 22.8),
  山药: n(57, 1.9, 0.2, 12.4), 莲藕: n(47, 1.2, 0.2, 11.5), 豆角: n(34, 2.5, 0.2, 6.7),
  四季豆: n(31, 2.0, 0.4, 5.7), 荷兰豆: n(32, 2.5, 0.2, 6.0), 芦笋: n(22, 2.2, 0.1, 3.3),
  莴笋: n(15, 1.0, 0.1, 2.8),
  // 水果
  苹果: n(53, 0.4, 0.2, 13.7), 香蕉: n(93, 1.4, 0.2, 22.0), 橙子: n(48, 0.8, 0.2, 11.1),
  橘子: n(44, 0.8, 0.1, 10.2), 柠檬: n(37, 1.1, 1.2, 6.2), 葡萄: n(45, 0.4, 0.3, 10.3),
  草莓: n(32, 1.0, 0.2, 7.1), 蓝莓: n(57, 0.7, 0.3, 14.5), 桃子: n(42, 0.6, 0.1, 10.1),
  樱桃: n(46, 1.1, 0.2, 10.2), 菠萝: n(44, 0.5, 0.1, 10.8), 芒果: n(35, 0.6, 0.2, 8.3),
  猕猴桃: n(61, 0.8, 0.6, 14.5), 西瓜: n(26, 0.5, 0.1, 5.8), 哈密瓜: n(34, 0.5, 0.1, 7.9),
  梨: n(44, 0.4, 0.2, 11.5), 火龙果: n(55, 1.1, 0.2, 13.3), 石榴: n(72, 1.3, 0.2, 18.5),
  牛油果: n(161, 2.0, 15.3, 7.4), 柚子: n(42, 0.8, 0.2, 9.5),
  // 肉类
  猪肉: n(395, 13.2, 37.0, 2.4), 猪里脊: n(155, 20.2, 7.9, 0.7), 五花肉: n(507, 7.7, 53.0, 0.9),
  排骨: n(278, 16.7, 23.1, 0.7), 牛肉: n(125, 19.9, 4.2, 2.0), 牛腩: n(332, 17.1, 29.5, 0.5),
  牛排: n(188, 20.2, 11.0, 0.5), 羊肉: n(203, 19.0, 14.1, 0), 鸡胸肉: n(133, 19.4, 5.0, 2.5),
  鸡腿: n(181, 16.0, 13.0, 0), 鸡翅: n(194, 17.4, 11.8, 4.6), 鸡爪: n(254, 23.9, 16.4, 2.7),
  鸭肉: n(240, 15.5, 19.7, 0.2), 培根: n(468, 22.3, 41.8, 1.5), 火腿: n(330, 16.0, 27.4, 4.9),
  香肠: n(508, 24.1, 40.7, 11.2), 午餐肉: n(229, 9.4, 18.9, 6.0),
  // 蛋奶
  鸡蛋: n(144, 13.3, 8.8, 2.8), 鸭蛋: n(180, 12.6, 13.0, 3.1), 鹌鹑蛋: n(160, 12.8, 11.1, 2.1),
  牛奶: n(54, 3.0, 3.2, 3.4), 酸奶: n(72, 2.5, 2.7, 9.3), 奶酪: n(328, 25.7, 23.5, 3.5),
  黄油: n(888, 1.4, 98.0, 0), 奶油: n(338, 0.7, 36.8, 2.9),
  // 水产
  三文鱼: n(139, 17.2, 7.8, 0), 鲈鱼: n(105, 18.6, 3.4, 0), 鲫鱼: n(108, 17.1, 2.7, 3.8),
  带鱼: n(127, 17.7, 4.9, 3.1), 龙利鱼: n(88, 15.5, 2.3, 1.0), 鳕鱼: n(88, 20.4, 0.5, 0.5),
  虾: n(93, 18.6, 0.8, 2.8), 虾仁: n(48, 10.4, 0.7, 0), 螃蟹: n(103, 17.5, 2.6, 2.3),
  扇贝: n(60, 11.1, 0.6, 2.6), 蛤蜊: n(62, 10.1, 1.1, 2.8), 鱿鱼: n(84, 17.4, 1.6, 0),
  章鱼: n(82, 14.9, 1.0, 2.2), 海带: n(17, 1.2, 0.1, 2.1), 紫菜: n(250, 26.7, 1.1, 44.1),
  // 主食（生重按生重、成品按成品）
  大米: n(346, 7.4, 0.8, 77.2), 糙米: n(348, 7.7, 2.7, 75.0), 小米: n(361, 9.0, 3.1, 75.1),
  燕麦: n(367, 15.0, 6.7, 61.6), 面粉: n(350, 10.3, 1.1, 75.2), 面条: n(109, 3.9, 0.4, 22.0),
  挂面: n(348, 10.3, 0.6, 74.5), 方便面: n(472, 9.5, 21.5, 60.9), 粉丝: n(338, 0.8, 0.2, 83.7),
  面包: n(312, 8.3, 5.1, 58.1), 吐司: n(290, 9.0, 3.9, 55.0), 馒头: n(223, 7.0, 1.1, 47.0),
  饺子: n(239, 8.5, 9.1, 30.7), 包子: n(227, 8.1, 8.4, 29.7), 红薯: n(99, 1.4, 0.2, 24.7),
  紫薯: n(106, 1.3, 0.3, 25.2), 藜麦: n(368, 14.1, 6.1, 64.2),
  // 豆制品
  豆腐: n(84, 8.1, 3.7, 4.2), 嫩豆腐: n(62, 6.2, 2.5, 2.8), 豆干: n(197, 16.2, 8.0, 4.0),
  腐竹: n(461, 44.6, 21.7, 22.3), 豆浆: n(16, 1.8, 0.7, 1.1), 黄豆: n(390, 35.0, 16.0, 34.2),
  绿豆: n(329, 21.6, 0.8, 62.0), 红豆: n(324, 20.2, 0.6, 63.4), 黑豆: n(401, 36.0, 15.9, 33.6),
  鹰嘴豆: n(378, 20.5, 6.0, 62.0),
  // 菌菇（鲜/水发）
  香菇: n(27, 2.2, 0.3, 5.2), 金针菇: n(32, 2.4, 0.4, 6.0), 杏鲍菇: n(35, 1.3, 0.1, 8.3),
  平菇: n(24, 1.9, 0.3, 4.6), 木耳: n(27, 1.5, 0.2, 6.0), 银耳: n(26, 1.0, 0.1, 6.4),
  口蘑: n(22, 3.1, 0.3, 3.3),
  // 调味（按实际用量计入）
  盐: n(0, 0, 0, 0), 糖: n(400, 0, 0, 99.9), 生抽: n(63, 7.8, 0.2, 9.9),
  老抽: n(85, 8.0, 0.1, 15.0), 醋: n(31, 2.1, 0.3, 4.9), 料酒: n(66, 0.6, 0, 2.5),
  蚝油: n(119, 4.7, 0.3, 24.0), 豆瓣酱: n(178, 13.6, 6.8, 17.1), 辣椒酱: n(88, 2.0, 5.0, 10.0),
  番茄酱: n(81, 1.6, 0.4, 18.0), 酱油: n(63, 7.8, 0.2, 9.9), 食用油: n(899, 0, 99.9, 0),
  橄榄油: n(899, 0, 99.9, 0), 芝麻油: n(898, 0, 99.7, 0.2), 花椒: n(258, 6.7, 8.9, 66.5),
  八角: n(195, 3.8, 5.6, 68.0), 桂皮: n(199, 11.7, 2.7, 40.5), 黑胡椒: n(351, 9.6, 2.2, 62.0),
  孜然: n(375, 18.0, 14.5, 44.0), 蜂蜜: n(321, 0.4, 1.9, 75.6), 咖喱: n(435, 14.0, 12.9, 66.9),
  // 坚果
  核桃: n(646, 14.9, 58.8, 19.1), 杏仁: n(578, 22.5, 45.4, 23.9), 花生: n(574, 24.8, 44.3, 21.7),
  腰果: n(559, 17.3, 36.7, 41.6), 开心果: n(631, 20.6, 53.0, 21.9), 瓜子: n(606, 23.9, 49.3, 12.5),
  芝麻: n(559, 19.1, 46.1, 24.0),
  // 其他
  枸杞: n(258, 13.9, 1.5, 64.1), 红枣: n(276, 3.2, 0.5, 67.8), 桂圆: n(313, 5.0, 0.2, 71.5),
  莲子: n(350, 17.2, 2.0, 67.2), 百合: n(166, 3.2, 0.1, 38.8), 蛋白粉: n(380, 75.0, 4.0, 8.0),
  麦片: n(370, 12.0, 7.0, 67.0), 咖啡: n(354, 12.2, 0.5, 57.9), 茶叶: n(296, 33.3, 2.4, 50.3),
  // 常见熟食/成品别名（记录三餐时的常用写法）
  米饭: n(116, 2.6, 0.3, 25.9), 白粥: n(46, 1.1, 0.3, 9.9), 粥: n(46, 1.1, 0.3, 9.9),
  蛋炒饭: n(186, 5.0, 6.7, 26.0), 鸡蛋羹: n(62, 5.6, 3.9, 1.6),
};

/** 食物名 → 分类（用于库外食物回退克数）。 */
export const FOOD_CATEGORY_BY_NAME: Record<string, string> = FOODS.reduce(
  (map, f) => { map[f.name] = f.category; return map; },
  {} as Record<string, string>,
);

// ---- 份量 → 克数换算 ----
// 按名的「单位 → 每单位克数」（口径与营养表一致：生食按生重，如一碗米饭按熟饭 200g）。
const NAME_UNIT_GRAMS: Record<string, Record<string, number>> = {
  米饭: { 碗: 200, 份: 200 }, 大米: { 碗: 75, 份: 75 }, 白粥: { 碗: 250, 份: 250 }, 粥: { 碗: 250 },
  面条: { 碗: 300, 把: 80, 份: 300 }, 挂面: { 把: 80, 份: 80 }, 粉丝: { 把: 40, 份: 40 },
  馒头: { 个: 100, 份: 100 }, 包子: { 个: 80 }, 饺子: { 个: 25, 份: 250 },
  吐司: { 片: 30, 袋: 250 }, 面包: { 片: 30, 个: 90, 袋: 250 }, 方便面: { 袋: 100, 包: 100 },
  红薯: { 个: 200 }, 紫薯: { 个: 150 }, 玉米: { 根: 200, 个: 200 },
  鸡蛋: { 个: 50 }, 鸭蛋: { 个: 60 }, 鹌鹑蛋: { 个: 10 },
  牛奶: { 盒: 250, 杯: 250, 袋: 200, 瓶: 250 }, 酸奶: { 盒: 200, 杯: 150, 瓶: 200 },
  豆浆: { 杯: 250, 瓶: 250, 盒: 250 }, 奶酪: { 片: 20, 块: 25 }, 黄油: { 块: 10, 勺: 8 },
  鸡胸肉: { 块: 120, 片: 80, 份: 120 }, 牛排: { 块: 180 }, 鸡腿: { 个: 120 }, 鸡翅: { 个: 40 },
  鸡爪: { 只: 30 }, 香肠: { 根: 60 }, 火腿: { 片: 15, 根: 30 },
  三文鱼: { 块: 150, 片: 30 }, 鳕鱼: { 块: 150 }, 龙利鱼: { 片: 120 }, 鲈鱼: { 条: 400 },
  鲫鱼: { 条: 250 }, 带鱼: { 条: 250, 段: 80 }, 虾: { 只: 15 }, 虾仁: { 份: 100 },
  螃蟹: { 只: 200 }, 鱿鱼: { 条: 200 },
  豆腐: { 块: 300, 份: 100 }, 嫩豆腐: { 盒: 350, 块: 300 }, 豆干: { 块: 50 }, 腐竹: { 份: 30, 把: 30 },
  香蕉: { 根: 110 }, 苹果: { 个: 200 }, 橙子: { 个: 180 }, 橘子: { 个: 90 }, 梨: { 个: 200 },
  柠檬: { 个: 60 }, 猕猴桃: { 个: 90 }, 桃子: { 个: 150 }, 西瓜: { 块: 300, 个: 2500 },
  火龙果: { 个: 300 }, 牛油果: { 个: 150 }, 哈密瓜: { 块: 250 }, 葡萄: { 串: 200, 颗: 5 },
  草莓: { 颗: 15 }, 樱桃: { 颗: 8 },
  花生: { 把: 15, 颗: 1 }, 核桃: { 颗: 6, 个: 10 }, 瓜子: { 把: 12 }, 腰果: { 颗: 2 },
  番茄: { 个: 150 }, 土豆: { 个: 150 }, 黄瓜: { 根: 180 }, 胡萝卜: { 根: 120 },
  青椒: { 个: 80 }, 红椒: { 个: 80 }, 洋葱: { 个: 200, 个头: 200 }, 茄子: { 根: 200 },
  白萝卜: { 根: 500 }, 山药: { 段: 150 }, 香菇: { 朵: 20 }, 金针菇: { 把: 100 },
  杏鲍菇: { 根: 100 }, 木耳: { 朵: 5 }, 银耳: { 朵: 30 },
  食用油: { 勺: 10, 少许: 5, 适量: 10 }, 橄榄油: { 勺: 10, 少许: 5 }, 芝麻油: { 勺: 5, 少许: 3 },
  盐: { 勺: 6, 少许: 2, 适量: 3 }, 糖: { 勺: 8, 少许: 3 }, 生抽: { 勺: 10, 少许: 5 },
  老抽: { 勺: 8, 少许: 4 }, 醋: { 勺: 10, 少许: 5 }, 料酒: { 勺: 12, 少许: 6 },
  蚝油: { 勺: 12, 少许: 6 }, 豆瓣酱: { 勺: 12, 少许: 6 }, 番茄酱: { 勺: 15, 少许: 8 },
  蜂蜜: { 勺: 15, 杯: 15 }, 咖啡: { 杯: 15, 包: 15 }, 蛋白粉: { 勺: 30, 杯: 30 },
  燕麦: { 碗: 40, 份: 40 }, 麦片: { 碗: 40, 袋: 40 }, 芝麻: { 少许: 3 },
  枸杞: { 把: 8, 颗: 0.5 }, 红枣: { 颗: 5, 个: 5 }, 莲子: { 把: 15 },
  酱油: { 勺: 10, 少许: 5 }, 辣椒酱: { 勺: 10, 少许: 5 },
};

/** 按分类的「单位 → 每单位克数」兜底。 */
const CATEGORY_UNIT_GRAMS: Record<string, Record<string, number>> = {
  蔬菜: { 个: 150, 根: 150, 把: 300, 份: 150, 只: 100, 段: 80 },
  水果: { 个: 180, 根: 120, 块: 200, 份: 180, 串: 200 },
  肉类: { 斤: 500, 克: 1, 块: 100, 片: 20, 份: 100, 个: 100 },
  蛋奶: { 个: 50, 盒: 250, 杯: 250, 袋: 200, 块: 25 },
  水产: { 斤: 500, 条: 300, 块: 150, 只: 200, 片: 30, 份: 120 },
  主食: { 份: 150, 碗: 200, 个: 80, 把: 80, 片: 30, 袋: 100 },
  豆制品: { 块: 80, 盒: 350, 份: 80, 袋: 50 },
  菌菇: { 斤: 500, 把: 100, 朵: 25, 份: 100 },
  调味: { 勺: 10, 少许: 4, 适量: 8, 瓶: 500 },
  坚果: { 把: 15, 颗: 2, 袋: 40, 份: 20 },
  其他: { 份: 50, 把: 10, 颗: 3, 杯: 200, 勺: 15 },
};

/** 未知食物的通用「单位 → 克数」最后兜底。 */
const GENERIC_UNIT_GRAMS: Record<string, number> = {
  克: 1, g: 1, 千克: 1000, kg: 1000, 公斤: 1000, 毫升: 1, ml: 1, 升: 1000, l: 1000,
  个: 80, 只: 80, 根: 130, 块: 80, 片: 15, 碗: 200, 杯: 250, 把: 60, 份: 120,
  条: 200, 段: 60, 颗: 5, 朵: 20, 勺: 10, 少许: 4, 适量: 10, 袋: 80, 盒: 200,
  瓶: 250, 罐: 200, 包: 80, 串: 150, 斤: 500, 两: 50,
};

const MEASURE_WORDS = new Set(Object.keys(GENERIC_UNIT_GRAMS));
const CHINESE_DIGITS: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };

export interface ParsedQuantity { count: number; unit: string }

/** 解析自由文本份量：「2个」「半碗」「200克」「一小碗」「适量」→ 数量+单位；解析不出按 1 份。 */
export function parseQuantity(quantity?: string | null): ParsedQuantity {
  if (!quantity || !quantity.trim()) return { count: 1, unit: "份" };
  const q = quantity.trim();
  const direct = /(\d+(?:\.\d+)?)\s*(千克|kg|公斤|克|毫升|ml|升|l|g)(?![a-z])/i.exec(q);
  if (direct) return { count: Number(direct[1]), unit: direct[2]!.toLowerCase() };
  const cn = /(半|一|二|两|三|四|五|六|七|八|九|十|\d+(?:\.\d+)?)(大|小|中)?(个|只|根|块|片|碗|杯|把|份|条|段|颗|朵|勺|袋|盒|瓶|罐|包|串|斤|两)/.exec(q);
  if (cn) {
    const base = CHINESE_DIGITS[cn[1]!] ?? Number(cn[1]) ?? 1;
    const size = cn[2] === "大" ? 1.5 : cn[2] === "小" ? 0.7 : 1;
    return { count: base * size, unit: cn[3]! };
  }
  for (const word of ["少许", "适量"]) if (q.includes(word)) return { count: 1, unit: word };
  return { count: 1, unit: "份" };
}

/** 查「每单位克数」：按名精确 → 按分类 → 通用兜底。 */
export function gramsPerUnit(name: string, unit: string): number {
  const perName = NAME_UNIT_GRAMS[name]?.[unit];
  if (perName) return perName;
  const category = FOOD_CATEGORY_BY_NAME[name];
  const perCategory = category ? CATEGORY_UNIT_GRAMS[category]?.[unit] : undefined;
  if (perCategory) return perCategory;
  return GENERIC_UNIT_GRAMS[unit] ?? 100;
}

/** 估算一份食物的总克数；克/公斤/毫升等单位直接换算。 */
export function estimateGrams(name: string, quantity?: string | null): number {
  const { count, unit } = parseQuantity(quantity);
  const per = gramsPerUnit(name, unit);
  return Math.max(1, Math.round(count * per * 10) / 10);
}

export interface ItemNutrition {
  grams: number;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carb: number | null;
  /** table=内置营养表精确匹配；estimate=表外食物按克数与通用口径估算 */
  source: "table" | "estimate";
}

const UNKNOWN_FOOD_PROFILE: NutritionProfile = { kcal: 120, protein: 5, fat: 5, carb: 15 };

/** 估算单项食物的营养：克数 × 每 100g 数值 / 100。表外食物按 120kcal/100g 的中性口径估算并标注。 */
export function estimateItemNutrition(name: string, quantity?: string | null): ItemNutrition {
  const grams = estimateGrams(name, quantity);
  const profile = FOOD_NUTRITION[name];
  if (!profile) return { grams, kcal: Math.round(UNKNOWN_FOOD_PROFILE.kcal * grams / 100), protein: null, fat: null, carb: null, source: "estimate" };
  const scale = grams / 100;
  return {
    grams,
    kcal: Math.round(profile.kcal * scale),
    protein: Math.round(profile.protein * scale * 10) / 10,
    fat: Math.round(profile.fat * scale * 10) / 10,
    carb: Math.round(profile.carb * scale * 10) / 10,
    source: "table",
  };
}

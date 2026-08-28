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

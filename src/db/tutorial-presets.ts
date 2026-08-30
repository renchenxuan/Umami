/**
 * 开小灶 · 内置家常菜预设教程（v11 迁移一次性播种进 recipes 表，source='preset'）。
 * 用量按 servings 人份换算；步骤写清火候与状态判断，供零基础照做。
 */
export interface PresetDish {
  title: string;
  meal: "早餐" | "午餐" | "晚餐";
  servings: number;
  total_minutes: number;
  ingredients: Array<{ name: string; amount: string; note?: string }>;
  prep: string[];
  cook: string[];
  tips: string;
}

export const TUTORIAL_PRESETS: PresetDish[] = [
  // ===================== 早餐 =====================
  {
    title: "快手鸡蛋饼", meal: "早餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "面粉", amount: "100g" }, { name: "鸡蛋", amount: "2 个（约100g）" },
      { name: "小葱", amount: "15g（1-2根）" }, { name: "盐", amount: "2g" },
      { name: "食用油", amount: "15ml" }, { name: "温水", amount: "160ml" },
    ],
    prep: ["面粉加盐，分两次倒入温水搅成无颗粒酸奶状面糊", "鸡蛋打散，小葱切葱花，一起倒进面糊拌匀", "静置 5 分钟让面糊醒发"],
    cook: ["平底锅刷薄油，中小火烧热到滴水面糊立刻凝固", "倒入一半面糊，转锅摊成圆片", "底面定型微黄（约 1 分钟）后翻面", "两面金黄、饼身鼓起小泡即出锅，切件装盘"],
    tips: "面糊太稠摊不开就补一勺水；火大了外糊里生，全程中小火最稳。",
  },
  {
    title: "小米南瓜粥", meal: "早餐", servings: 2, total_minutes: 35,
    ingredients: [
      { name: "小米", amount: "80g" }, { name: "南瓜", amount: "200g", note: "选老南瓜更甜" },
      { name: "清水", amount: "1200ml" },
    ],
    prep: ["小米淘洗 2 遍，不用力搓（保留表层营养）", "南瓜去皮去瓤，切 2cm 小块"],
    cook: ["水烧开后下小米，大火煮开撇去浮沫", "放南瓜块，转小火盖盖留缝煮 25 分钟", "每隔 8 分钟开盖搅一次防止糊底", "南瓜化沙、米粒开花后关火焖 5 分钟，粥面结出米油即成"],
    tips: "冷水下锅容易糊底，一定要水开再下米；赶时间用高压锅上汽后 8 分钟。",
  },
  {
    title: "牛奶燕麦碗", meal: "早餐", servings: 1, total_minutes: 5,
    ingredients: [
      { name: "即食燕麦片", amount: "40g" }, { name: "牛奶", amount: "250ml" },
      { name: "香蕉", amount: "1 根（约120g）" }, { name: "坚果碎", amount: "10g", note: "可选" },
    ],
    prep: ["香蕉半根压成泥、半根切片", "燕麦片倒进碗中备用", "坚果装入小袋压碎"],
    cook: ["燕麦片倒入牛奶，微波炉高火 90 秒（或小锅小火煮 2 分钟）", "中途搅拌一次，煮至浓稠挂勺", "拌入香蕉泥，铺上香蕉片和坚果碎即可"],
    tips: "即食燕麦不用煮太久，否则成糊失去口感；想要冰的可以前一晚泡好放冰箱（隔夜燕麦）。",
  },
  {
    title: "火腿芝士三明治", meal: "早餐", servings: 1, total_minutes: 10,
    ingredients: [
      { name: "吐司", amount: "2 片（约60g）" }, { name: "火腿片", amount: "40g" },
      { name: "芝士片", amount: "1 片（约20g）" }, { name: "鸡蛋", amount: "1 个（约50g）" },
      { name: "生菜", amount: "2 片" }, { name: "黄油或食用油", amount: "5g" },
    ],
    prep: ["生菜洗净甩干水分", "平底锅小火煎一个蛋（凝固即可，保留流心感更香）"],
    cook: ["吐司单面抹薄黄油，锅中小火烘至两面微脆", "按 吐司→生菜→火腿→芝士→煎蛋→生菜→吐司 叠放", "对角切开，芝士遇热微融即可食用"],
    tips: "生菜一定要甩干，湿叶子会让吐司变软；带去公司吃就用油纸整个卷紧再切。",
  },
  {
    title: "香煎馒头片", meal: "早餐", servings: 2, total_minutes: 10,
    ingredients: [
      { name: "馒头", amount: "1 个（约150g），隔夜更佳" }, { name: "鸡蛋", amount: "2 个（约100g）" },
      { name: "盐", amount: "1g" }, { name: "食用油", amount: "20ml" },
    ],
    prep: ["馒头切 1cm 厚片", "鸡蛋加盐打散"],
    cook: ["馒头片两面快速裹上蛋液", "平底锅油五成热（筷子插入小泡）下馒头片", "中小火煎至两面金黄（每面约 1 分钟）", "出锅撒少许盐或蘸炼乳吃"],
    tips: "蛋液要「快裹」不要泡，吸太多蛋液就软塌了；隔夜硬馒头比新鲜的好煎。",
  },
  {
    title: "水嫩蒸蛋羹", meal: "早餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "鸡蛋", amount: "2 个（约100g）" }, { name: "温水", amount: "200ml（约40°C）" },
      { name: "盐", amount: "1.5g" }, { name: "生抽", amount: "5ml" }, { name: "香油", amount: "3ml" },
    ],
    prep: ["鸡蛋加盐打散，倒入约 1.5 倍蛋液的温水", "蛋液过筛进蒸碗，撇去表面气泡"],
    cook: ["蒸锅水开后放入蒸碗，盖一层盘子或保鲜膜扎孔", "中小火蒸 10 分钟，关火再焖 3 分钟", "表面凝固像布丁、无大孔即成，淋生抽和香油"],
    tips: "蛋水比 1:1.5 是嫩滑关键；大火或时间过长都会出蜂窝孔。",
  },
  {
    title: "入味茶叶蛋", meal: "早餐", servings: 4, total_minutes: 60,
    ingredients: [
      { name: "鸡蛋", amount: "8 个（约400g）" }, { name: "红茶包", amount: "2 包（或红茶叶 10g）" },
      { name: "八角", amount: "2 颗" }, { name: "桂皮", amount: "1 小段" },
      { name: "生抽", amount: "30ml" }, { name: "老抽", amount: "10ml" }, { name: "盐", amount: "10g" }, { name: "冰糖", amount: "10g" },
    ],
    prep: ["鸡蛋冷水下锅，加少许盐防裂", "备好香料：八角掰开、桂皮冲水", "煮蛋的空档调卤汁：生抽老抽盐糖"],
    cook: ["水开后中火煮 7 分钟，捞出过冷水", "用勺背把蛋壳敲出均匀裂纹（不剥壳）", "锅里换清水，放茶包、八角、桂皮、生抽老抽盐糖煮开", "放入裂纹蛋，小火煮 15 分钟后关火", "连汤浸泡 4 小时以上（隔夜更入味），吃前加热"],
    tips: "裂纹敲得越匀，大理石纹越漂亮；卤汤别倒掉，过滤冷冻可以重复用一次。",
  },
  {
    title: "香蕉松饼", meal: "早餐", servings: 2, total_minutes: 20,
    ingredients: [
      { name: "香蕉", amount: "1 根（约120g，选熟透的）" }, { name: "鸡蛋", amount: "1 个（约50g）" },
      { name: "面粉", amount: "60g" }, { name: "牛奶", amount: "50ml" },
      { name: "泡打粉", amount: "2g", note: "可选，更松软" }, { name: "食用油", amount: "5ml" },
    ],
    prep: ["香蕉压成泥，加鸡蛋、牛奶拌匀", "面粉（加泡打粉）筛入香蕉糊，拌到无干粉即可，不要过度搅拌"],
    cook: ["平底锅刷极薄一层油，小火加热", "舀一勺面糊自然摊成小圆饼", "表面冒出小气泡、边缘定型后翻面", "另一面煎 30 秒至金黄，配酸奶或蜂蜜吃"],
    tips: "全程小火，颜色浅金色就翻面；面糊拌过头起筋会让松饼发硬。",
  },
  {
    title: "皮蛋瘦肉粥", meal: "早餐", servings: 2, total_minutes: 45,
    ingredients: [
      { name: "大米", amount: "80g" }, { name: "猪里脊", amount: "80g" },
      { name: "皮蛋", amount: "1 个（约60g）" }, { name: "姜丝", amount: "5g" },
      { name: "盐", amount: "3g" }, { name: "白胡椒粉", amount: "1g" }, { name: "小葱", amount: "10g" },
    ],
    prep: ["大米洗净加 5ml 油和 2g 盐腌 15 分钟（粥底更绵滑）", "里脊切细丝，用 1g 盐和 5ml 水抓至发黏", "皮蛋切小丁，葱切花"],
    cook: ["水开下腌好的米，大火煮开转小火 25 分钟", "粥开花时下肉丝，用筷子拨散煮 3 分钟", "放一半皮蛋丁和姜丝再煮 5 分钟", "加盐、白胡椒粉调味，撒葱花和剩余皮蛋丁"],
    tips: "肉丝后放才嫩；米提前用油盐腌是粥店绵滑的秘诀。",
  },
  {
    title: "一碗热汤面", meal: "早餐", servings: 1, total_minutes: 15,
    ingredients: [
      { name: "挂面", amount: "100g" }, { name: "鸡蛋", amount: "1 个（约50g）" },
      { name: "青菜", amount: "50g" }, { name: "生抽", amount: "10ml" },
      { name: "香油", amount: "3ml" }, { name: "小葱", amount: "10g" }, { name: "猪油或食用油", amount: "8g", note: "猪油更香" },
    ],
    prep: ["碗底放生抽、香油、猪油、葱花", "青菜洗净"],
    cook: ["烧水，水开先舀两勺冲进碗里做成汤底", "下面条煮 3 分钟（中间点一次冷水更筋道）", "最后 1 分钟下青菜和窝个鸡蛋（或另煎荷包蛋）", "面捞进汤碗，摆上青菜和蛋即可"],
    tips: "碗底调料先用热汤冲开，汤才有香气；面条别煮过软，有一点白芯就捞。",
  },
  {
    title: "酸奶水果杯", meal: "早餐", servings: 1, total_minutes: 5,
    ingredients: [
      { name: "浓稠酸奶", amount: "200g" }, { name: "苹果", amount: "半个（约100g）" },
      { name: "蓝莓", amount: "50g", note: "应季水果可替换" }, { name: "燕麦脆或坚果", amount: "15g" }, { name: "蜂蜜", amount: "5g", note: "可选" },
    ],
    prep: ["苹果切小丁（泡淡盐水防氧化）", "蓝莓洗净沥干", "选一个透明杯方便看到分层"],
    cook: ["杯底铺一层酸奶，加一层苹果丁", "再铺一层酸奶，摆上蓝莓", "最上层撒燕麦脆，淋少许蜂蜜即可", "冰凉口感更好，冷藏 10 分钟再吃"],
    tips: "免开火的 5 分钟早餐；水果选硬质的（苹果/梨/葡萄）不出水，软的（草莓）现吃现放。",
  },
  {
    title: "葱油拌面", meal: "早餐", servings: 2, total_minutes: 20,
    ingredients: [
      { name: "鲜面条", amount: "200g" }, { name: "小葱", amount: "60g（4-5根）" },
      { name: "生抽", amount: "25ml" }, { name: "老抽", amount: "10ml" }, { name: "白糖", amount: "5g" },
      { name: "食用油", amount: "40ml" },
    ],
    prep: ["小葱洗净擦干，切 5cm 长段", "生抽老抽糖调成酱汁"],
    cook: ["冷油下葱段，最小火慢慢炸 10 分钟至焦黄（不是焦黑）", "捞出葱段，倒入酱汁关火利用余温激香，葱油汁完成", "面条煮熟捞出沥干", "面条拌入 2 勺葱油汁，撒脆葱段"],
    tips: "炸葱油全程最小火，焦了会发苦；一次多做葱油汁冷藏，随吃随拌。",
  },
  // ===================== 午餐 =====================
  {
    title: "番茄炒蛋", meal: "午餐", servings: 2, total_minutes: 20,
    ingredients: [
      { name: "番茄", amount: "400g（约2个）", note: "需购买" }, { name: "鸡蛋", amount: "3 个（约150g）" },
      { name: "小葱", amount: "10g" }, { name: "白糖", amount: "3g", note: "提鲜，可省略" }, { name: "盐", amount: "3g" },
    ],
    prep: ["番茄顶部划十字，开水烫 30 秒去皮切滚刀块", "鸡蛋加 1g 盐打散至起小泡"],
    cook: ["热锅倒 20ml 油，六成热下蛋液，刚凝固就盛出", "补 10ml 油爆香葱花，中火炒番茄 2 分钟至出汁", "加 2g 盐和糖，回锅蛋块翻 30 秒", "汤汁裹匀蛋块关火，撒葱花出锅"],
    tips: "1）蛋液炒老：凝固就盛出，余温会续熟；2）番茄不出汁：中火耐心压一压别加水；3）盐分两次放才不会出太多水。",
  },
  {
    title: "青椒肉丝", meal: "午餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "猪里脊", amount: "250g", note: "换梅花肉更嫩" }, { name: "青椒", amount: "200g（3个）" },
      { name: "料酒", amount: "10ml" }, { name: "生抽", amount: "15ml" },
      { name: "淀粉", amount: "5g" }, { name: "盐", amount: "3g" }, { name: "蒜", amount: "2 瓣" },
    ],
    prep: ["里脊顺纹切丝，加料酒 5ml、生抽 5ml、淀粉和水 10ml 抓匀腌 10 分钟", "青椒去籽切丝，蒜切片", "调碗汁：生抽 10ml + 料酒 5ml + 盐 + 水 15ml"],
    cook: ["热锅凉油滑炒肉丝至变白刚断生，盛出", "底油爆香蒜片，大火炒青椒丝 1 分钟", "回锅肉丝，淋碗汁翻炒 30 秒收汁出锅"],
    tips: "肉丝腌制加水抓匀是嫩的关键；青椒大火快炒保留脆感。",
  },
  {
    title: "黄金蛋炒饭", meal: "午餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "隔夜米饭", amount: "300g（2小碗）" }, { name: "鸡蛋", amount: "2 个（约100g）" },
      { name: "火腿丁", amount: "50g", note: "可选" }, { name: "葱花", amount: "15g" },
      { name: "盐", amount: "3g" }, { name: "食用油", amount: "25ml" },
    ],
    prep: ["隔夜饭用手或勺压散，不要有结块", "鸡蛋打散（分蛋炒法：只取蛋黄入饭更金黄）"],
    cook: ["热锅下油，先炒火腿丁 30 秒盛出", "补油下蛋液，蛋液半凝固时倒入米饭", "大火把米粒炒散炒透，让每粒裹上蛋液（约 2 分钟）", "加盐和火腿丁，撒葱花出锅"],
    tips: "隔夜饭是灵魂，现煮饭要摊凉吹干；中火炒不粘锅，大火要有量才颠得动。",
  },
  {
    title: "酸辣土豆丝", meal: "午餐", servings: 2, total_minutes: 20,
    ingredients: [
      { name: "土豆", amount: "300g（1大个）" }, { name: "干辣椒", amount: "3 个" },
      { name: "花椒", amount: "1g（约15粒）" }, { name: "白醋", amount: "15ml" },
      { name: "盐", amount: "3g" }, { name: "蒜", amount: "2 瓣" }, { name: "青椒", amount: "半个", note: "配色可选" },
    ],
    prep: ["土豆切细丝，清水冲 3 遍去淀粉，泡水防变黑", "干辣椒剪段，蒜切片"],
    cook: ["油四成热下花椒小火炸香捞出，再下干辣椒和蒜片", "倒入沥干的土豆丝，大火快炒 1 分钟", "沿锅边淋白醋，加盐再炒 1 分钟", "土豆丝变透亮但仍脆时立即出锅"],
    tips: "醋分两次放（炒时+出锅前）酸香最立体；全程大火快炒才脆，炒软就失败了。",
  },
  {
    title: "香菇油菜", meal: "午餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "油菜", amount: "300g" }, { name: "鲜香菇", amount: "150g（5朵）" },
      { name: "蒜", amount: "3 瓣" }, { name: "蚝油", amount: "10ml", note: "可换素蚝油" },
      { name: "盐", amount: "2g" }, { name: "淀粉", amount: "3g" },
    ],
    prep: ["香菇去蒂切厚片，油菜对半剖开洗净", "蚝油+淀粉+50ml 水调成碗汁"],
    cook: ["水开加 3g 盐和几滴油，油菜烫 30 秒捞出摆盘", "热锅爆香蒜片，炒香菇 2 分钟至出香变软", "倒入碗汁煮至浓稠", "香菇连汁浇在油菜上"],
    tips: "油菜焯水加油盐颜色才翠绿；香菇要炒到「厚边软心」香味才出来。",
  },
  {
    title: "肉末茄子", meal: "午餐", servings: 2, total_minutes: 30,
    ingredients: [
      { name: "长茄子", amount: "400g（2根）" }, { name: "猪肉末", amount: "100g" },
      { name: "豆瓣酱", amount: "15g" }, { name: "蒜", amount: "3 瓣" },
      { name: "生抽", amount: "10ml" }, { name: "白糖", amount: "3g" }, { name: "淀粉", amount: "5g" },
    ],
    prep: ["茄子切条，撒 3g 盐抓匀腌 10 分钟，挤干水分（少吸油的关键）", "肉末加 5ml 生抽和淀粉拌匀"],
    cook: ["热锅少油，把茄子中火煎到两面微黄变软，盛出", "底油炒散肉末至变色，加豆瓣酱和蒜末炒出红油", "回锅茄子翻匀，加 50ml 水和糖，盖盖小火焖 3 分钟", "大火收汁至浓稠挂汁"],
    tips: "茄子先腌挤水，用油量能减一半；豆瓣酱够咸，尝过再补盐。",
  },
  {
    title: "凉拌黄瓜", meal: "午餐", servings: 2, total_minutes: 10,
    ingredients: [
      { name: "黄瓜", amount: "300g（2根）" }, { name: "蒜", amount: "3 瓣" },
      { name: "生抽", amount: "10ml" }, { name: "香醋", amount: "15ml" },
      { name: "白糖", amount: "3g" }, { name: "香油", amount: "5ml" }, { name: "干辣椒", amount: "1 个", note: "可选" },
    ],
    prep: ["黄瓜用刀背拍裂再切块（拍过的更入味）", "加 2g 盐腌 5 分钟倒掉渗出的水", "蒜切末，生抽+醋+糖+香油调成料汁"],
    cook: ["料汁浇在黄瓜上拌匀", "撒蒜末和干辣椒段，烧热一勺油「刺啦」淋上去激香", "拌匀静置 2 分钟再吃更入味"],
    tips: "拍不拍差很多：拍的断面吸味；先腌后拌是脆爽关键。",
  },
  {
    title: "番茄鸡蛋面", meal: "午餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "番茄", amount: "300g（2个）" }, { name: "鸡蛋", amount: "2 个（约100g）" },
      { name: "鲜面条", amount: "200g" }, { name: "番茄酱", amount: "10g", note: "可选，汤更浓" },
      { name: "盐", amount: "3g" }, { name: "小葱", amount: "10g" },
    ],
    prep: ["番茄去皮切块，鸡蛋打散", "小葱切花，面条备好"],
    cook: ["热油先炒蛋至凝固盛出", "下番茄中火炒 3 分钟至完全出沙，加番茄酱炒匀", "加 800ml 水煮开，小火煮 5 分钟成浓汤", "下面条煮 3 分钟，淋回蛋液搅出蛋花，加盐调味"],
    tips: "番茄一定要炒出沙再加水，汤才红亮；蛋花要最后淋，滚汤里一搅就成型。",
  },
  {
    title: "简易宫保鸡丁", meal: "午餐", servings: 2, total_minutes: 30,
    ingredients: [
      { name: "鸡胸肉", amount: "250g" }, { name: "熟花生米", amount: "50g" },
      { name: "干辣椒", amount: "5 个" }, { name: "花椒", amount: "1g" },
      { name: "大葱", amount: "1 根（约50g）" }, { name: "生抽", amount: "15ml" },
      { name: "香醋", amount: "15ml" }, { name: "白糖", amount: "8g" }, { name: "淀粉", amount: "8g" },
    ],
    prep: ["鸡胸切 1.5cm 丁，加 5ml 生抽、5g 淀粉和 10ml 水腌 15 分钟", "碗汁：生抽 10ml+香醋+糖+淀粉 3g+水 30ml", "葱切 1.5cm 段，干辣椒剪段去籽"],
    cook: ["油五成热下鸡丁滑炒至变色盛出", "底油小火煸干辣椒和花椒出香（别炒黑）", "下葱段、回锅鸡丁，淋碗汁大火翻匀", "汁浓亮时撒花生米出锅"],
    tips: "花生米最后放才脆；酸甜辣平衡靠碗汁一次调好，中途再补味道不准。",
  },
  {
    title: "清炒油麦菜", meal: "午餐", servings: 2, total_minutes: 10,
    ingredients: [
      { name: "油麦菜", amount: "300g" }, { name: "蒜", amount: "4 瓣" },
      { name: "盐", amount: "2.5g" }, { name: "食用油", amount: "15ml" },
    ],
    prep: ["油麦菜洗净切段，梗叶分开", "蒜拍碎切末"],
    cook: ["大火烧热锅下油，先下蒜爆香 3 秒", "下菜梗炒 30 秒，再下菜叶", "加盐，快速翻炒 40 秒至叶子刚变深绿", "立即出锅，脆嫩不发黄"],
    tips: "绿叶菜全程大火、时间宁短勿长；锅要够热再下菜，菜叶才不出水。",
  },
  {
    title: "土豆炖豆角", meal: "午餐", servings: 2, total_minutes: 35,
    ingredients: [
      { name: "土豆", amount: "250g（1个）" }, { name: "四季豆", amount: "250g" },
      { name: "五花肉", amount: "80g", note: "可选，素炖也好吃" }, { name: "生抽", amount: "15ml" },
      { name: "八角", amount: "1 颗" }, { name: "盐", amount: "3g" }, { name: "蒜", amount: "2 瓣" },
    ],
    prep: ["四季豆掰段洗净，土豆去皮切滚刀块", "五花肉切薄片"],
    cook: ["少油中小火把五花肉煸出油、微卷焦边", "下豆角炒到表皮起皱（约 3 分钟，去豆腥）", "下土豆块、生抽、八角翻匀，加热水没过食材", "盖盖中小火炖 15 分钟，土豆沙面后加盐收汁", "出锅前压碎几块土豆让汤汁更浓"],
    tips: "四季豆必须彻底炖熟（不熟有毒素）；汤汁别收太干，拌饭一绝。",
  },
  {
    title: "芹菜香干", meal: "午餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "芹菜", amount: "250g" }, { name: "香干", amount: "150g（2块）" },
      { name: "生抽", amount: "10ml" }, { name: "盐", amount: "2g" }, { name: "干辣椒", amount: "1 个", note: "可选" },
    ],
    prep: ["芹菜撕去老筋斜切段，香干切细条", "烧一锅水备用焯水"],
    cook: ["芹菜焯水 30 秒过凉（保持脆绿）", "热锅下香干中火煸到边缘微黄起泡", "下芹菜、生抽、盐大火翻炒 1 分钟", "翻匀即可出锅"],
    tips: "香干煸过才香而不腥；芹菜焯水后炒制时间减半，颜色更好。",
  },
  // ===================== 晚餐 =====================
  {
    title: "可乐鸡翅", meal: "晚餐", servings: 2, total_minutes: 30,
    ingredients: [
      { name: "鸡翅中", amount: "500g（约8个）" }, { name: "可乐", amount: "330ml（1罐）" },
      { name: "生姜", amount: "15g（3片）" }, { name: "生抽", amount: "20ml" },
      { name: "老抽", amount: "5ml" }, { name: "料酒", amount: "15ml" },
    ],
    prep: ["鸡翅两面各划一刀方便入味", "冷水下锅加料酒和姜片，焯水 2 分钟撇沫捞出洗净"],
    cook: ["少油中火把鸡翅煎到两面金黄（约 4 分钟）", "倒入可乐没过鸡翅，加生抽老抽", "盖盖中小火焖 12 分钟", "开盖大火收汁，不断把汁淋在鸡翅上", "汁浓亮起大泡时出锅（别收干成糖浆）"],
    tips: "不用额外加糖，可乐糖分足够；收汁时人别离锅，糊底就是一锅苦。",
  },
  {
    title: "家常红烧肉", meal: "晚餐", servings: 3, total_minutes: 75,
    ingredients: [
      { name: "带皮五花肉", amount: "500g" }, { name: "冰糖", amount: "20g" },
      { name: "生姜", amount: "15g（3片）" }, { name: "大葱", amount: "1 段（30g）" },
      { name: "八角", amount: "2 颗" }, { name: "生抽", amount: "20ml" }, { name: "老抽", amount: "10ml" }, { name: "料酒", amount: "20ml" },
    ],
    prep: ["五花肉切 2.5cm 见方块", "冷水下锅加料酒姜片，焯水 3 分钟捞出用温水洗净"],
    cook: ["干锅中小火煸肉块 5 分钟，煸出多余油脂（肉块四面微黄）", "倒掉多余油，下冰糖小火炒出琥珀色糖色", "肉块回锅裹匀糖色，加葱姜八角、生抽老抽", "加热水完全没过肉，盖盖小火炖 45 分钟", "大火收汁到浓稠挂肉，肥肉颤巍巍入口即化"],
    tips: "糖色宁可浅不可黑（发苦）；炖煮加热水不加冷水，肉才不柴。",
  },
  {
    title: "清蒸鲈鱼", meal: "晚餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "鲈鱼", amount: "1 条（约600g）", note: "请摊主宰杀去鳞" }, { name: "大葱", amount: "2 根（60g）" },
      { name: "生姜", amount: "30g" }, { name: "蒸鱼豉油", amount: "25ml" }, { name: "食用油", amount: "25ml" },
    ],
    prep: ["鱼身两面各划两刀，塞入部分葱段姜丝", "盘底垫葱段把鱼架起来（蒸汽循环更均匀）"],
    cook: ["蒸锅水大开后放鱼，大火蒸 8-10 分钟（600g 约 8 分钟）", "出锅倒掉盘中腥水、拣掉旧葱姜", "鱼身铺新鲜葱丝姜丝", "烧热油至冒烟，淋在葱姜丝上激出香气", "沿盘边淋蒸鱼豉油（不直接淋鱼身）"],
    tips: "时间宁欠勿过，多蒸 2 分钟肉就柴；腥水一定要倒干净。",
  },
  {
    title: "家常麻婆豆腐", meal: "晚餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "嫩豆腐", amount: "400g（1盒）" }, { name: "猪肉末", amount: "80g", note: "可选" },
      { name: "豆瓣酱", amount: "15g" }, { name: "豆豉", amount: "5g", note: "可选" },
      { name: "花椒粉", amount: "2g" }, { name: "蒜", amount: "2 瓣" }, { name: "淀粉", amount: "5g" }, { name: "生抽", amount: "10ml" },
    ],
    prep: ["豆腐切 2cm 方块，盐水焯 1 分钟（定型去豆腥）", "淀粉+50ml 水调芡汁"],
    cook: ["少油炒散肉末至酥香，下豆瓣酱、豆豉、蒜末炒出红油", "加 200ml 水煮开，轻推入豆腐块", "中小火烧 4 分钟让豆腐入味，分两次淋入芡汁", "轻推至汤汁浓稠裹身，撒花椒粉出锅"],
    tips: "豆腐先盐水焯不容易碎；「推」不要「翻」，锅铲贴底轻轻推。",
  },
  {
    title: "干煸四季豆", meal: "晚餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "四季豆", amount: "400g" }, { name: "猪肉末", amount: "60g", note: "可选" },
      { name: "芽菜或榨菜碎", amount: "20g", note: "可选" }, { name: "干辣椒", amount: "4 个" },
      { name: "蒜", amount: "3 瓣" }, { name: "生抽", amount: "10ml" }, { name: "盐", amount: "2g" },
    ],
    prep: ["四季豆掰段彻底晾干（带水下锅会溅油）", "蒜切末，干辣椒剪段"],
    cook: ["多一点的油中火把豆角煸到表皮起皱、微微焦斑（约 6 分钟），盛出", "底油炒肉末酥香，下干辣椒、蒜末、芽菜炒香", "回锅豆角，加生抽和盐大火翻匀", "干香入味即可出锅"],
    tips: "四季豆务必煸透炒熟（半生有毒）；表皮起皱才是干煸到位的信号。",
  },
  {
    title: "玉米排骨汤", meal: "晚餐", servings: 3, total_minutes: 70,
    ingredients: [
      { name: "猪排骨", amount: "400g" }, { name: "甜玉米", amount: "1 根（约300g）" },
      { name: "胡萝卜", amount: "100g（1根）" }, { name: "生姜", amount: "10g（2片）" },
      { name: "料酒", amount: "15ml" }, { name: "盐", amount: "4g" }, { name: "小葱", amount: "10g" },
    ],
    prep: ["排骨冷水下锅加料酒姜片，焯水撇沫捞出温水冲净", "玉米切段，胡萝卜切滚刀块"],
    cook: ["排骨加姜片和足量热水，大火煮开转小火炖 30 分钟", "下玉米和胡萝卜再炖 20 分钟", "汤色清亮微白、排骨酥软后加盐调味", "撒葱花出锅，喝汤吃肉"],
    tips: "焯水后用温水冲（冷水激肉会发柴）；盐一定最后放，早放肉柴汤鲜味也闷。",
  },
  {
    title: "家常豆腐", meal: "晚餐", servings: 2, total_minutes: 25,
    ingredients: [
      { name: "老豆腐", amount: "400g（1块）" }, { name: "青椒", amount: "1 个（约80g）" },
      { name: "木耳", amount: "10g（干）", note: "提前泡发" }, { name: "豆瓣酱", amount: "12g" },
      { name: "生抽", amount: "10ml" }, { name: "白糖", amount: "3g" }, { name: "蒜", amount: "2 瓣" },
    ],
    prep: ["豆腐切 1cm 厚三角片，厨房纸吸干水分", "青椒切块，木耳撕小朵"],
    cook: ["中火烧油把豆腐煎到两面金黄硬壳，盛出", "底油下豆瓣酱、蒜末炒出红油，加 100ml 水", "下豆腐、木耳、糖小火烧 4 分钟", "下青椒大火收汁翻匀出锅"],
    tips: "老豆腐才煎得定型；煎豆腐别急着翻，晃锅能动说明壳已成型。",
  },
  {
    title: "蒜蓉粉丝蒸虾", meal: "晚餐", servings: 2, total_minutes: 30,
    ingredients: [
      { name: "鲜虾", amount: "300g（约10只）" }, { name: "绿豆粉丝", amount: "50g（1把）" },
      { name: "蒜", amount: "2 头（约60g）" }, { name: "蒸鱼豉油", amount: "20ml" },
      { name: "食用油", amount: "30ml" }, { name: "小葱", amount: "10g" },
    ],
    prep: ["粉丝温水泡 10 分钟剪段铺盘底", "虾开背去虾线，刀背轻剁防卷曲，摆粉丝上", "2 头蒜剁成蓉，分成两份"],
    cook: ["一半蒜蓉炒至金黄，关火拌入另一半生蒜蓉（金银蒜）", "蒜蓉铺在虾背上", "水开大火蒸 6 分钟（虾壳变红即可）", "淋蒸鱼豉油、撒葱花，烧热油淋激香"],
    tips: "金银蒜是灵魂：熟蒜香、生蒜辛，缺一不可；蒸过头虾肉缩成小球。",
  },
  {
    title: "手撕包菜", meal: "晚餐", servings: 2, total_minutes: 15,
    ingredients: [
      { name: "包菜", amount: "500g（半个）" }, { name: "五花肉", amount: "50g", note: "可选" },
      { name: "干辣椒", amount: "4 个" }, { name: "蒜", amount: "3 瓣" },
      { name: "白醋", amount: "10ml" }, { name: "生抽", amount: "10ml" }, { name: "盐", amount: "2.5g" },
    ],
    prep: ["包菜用手撕成大块（断面比刀切吸味），梗和叶分开", "五花肉切薄片，蒜切片，干辣椒剪段"],
    cook: ["中小火把五花肉煸出油微卷", "下蒜片干辣椒爆香，先下菜梗炒 30 秒", "再下菜叶，大火猛炒 1 分钟", "沿锅边淋醋和生抽，加盐翻 20 秒出锅"],
    tips: "手撕+猛火是镬气的来源；醋淋锅边才香，直接浇菜上会酸得死板。",
  },
  {
    title: "蚝油生菜", meal: "晚餐", servings: 2, total_minutes: 10,
    ingredients: [
      { name: "生菜", amount: "400g（1棵）" }, { name: "蚝油", amount: "15ml" },
      { name: "生抽", amount: "10ml" }, { name: "白糖", amount: "3g" },
      { name: "淀粉", amount: "3g" }, { name: "蒜", amount: "3 瓣" }, { name: "食用油", amount: "10ml" },
    ],
    prep: ["生菜洗净撕大片", "蚝油+生抽+糖+淀粉+80ml 水调匀成碗汁", "蒜切末"],
    cook: ["水开加几滴油，生菜烫 20 秒立刻捞出摆盘", "热锅少油爆香蒜末，倒入碗汁小火搅到浓稠", "蚝油汁浇在生菜上即可"],
    tips: "烫 20 秒是脆嫩的极限时间，多一秒就蔫；生菜出水，汁略调浓一点。",
  },
  {
    title: "番茄牛腩", meal: "晚餐", servings: 3, total_minutes: 100,
    ingredients: [
      { name: "牛腩", amount: "500g" }, { name: "番茄", amount: "500g（3个）" },
      { name: "洋葱", amount: "150g（半个）" }, { name: "生姜", amount: "10g" },
      { name: "番茄酱", amount: "20g" }, { name: "料酒", amount: "15ml" }, { name: "盐", amount: "4g" }, { name: "冰糖", amount: "8g" },
    ],
    prep: ["牛腩切 3cm 块冷水下锅加料酒焯水，撇沫捞出温水洗净", "2 个番茄去皮切块，1 个切大丁，洋葱切丝"],
    cook: ["少油炒软洋葱丝，下番茄块炒出沙（约 4 分钟）", "下牛腩翻炒 2 分钟裹上茄汁", "加热水没过两指，加番茄酱和冰糖，盖盖小火炖 70 分钟", "下番茄大丁再炖 10 分钟（保留果肉口感）", "加盐调味，汤汁浓稠、牛腩用筷子轻松扎透即成"],
    tips: "中途水不够必须加热水；番茄分两批下，一批化进汤里、一批吃口感。",
  },
  {
    title: "蒜苔炒肉", meal: "晚餐", servings: 2, total_minutes: 20,
    ingredients: [
      { name: "蒜苔", amount: "300g" }, { name: "猪里脊", amount: "150g" },
      { name: "生抽", amount: "15ml" }, { name: "淀粉", amount: "5g" },
      { name: "盐", amount: "2g" }, { name: "蚝油", amount: "10ml", note: "可选" },
    ],
    prep: ["蒜苔切段，焯水 40 秒（去辛辣、易熟）", "肉切丝加 5ml 生抽、淀粉、10ml 水腌 10 分钟"],
    cook: ["热锅凉油滑炒肉丝至变白盛出", "底油下蒜苔中火炒 1 分钟出虎皮小斑", "回锅肉丝，加生抽蚝油盐大火翻匀", "30 秒出锅，蒜苔保持脆感"],
    tips: "蒜苔焯水后再炒就不外焦内生；喜欢辣的换小米辣爆锅。",
  },
];

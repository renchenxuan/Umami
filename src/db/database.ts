import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { FOODS, FOOD_CATEGORIES, unitFor, estimateItemNutrition, FOOD_NUTRITION } from "./foods-data";

export interface Ingredient { id:number; name:string; quantity:string; category:string; source:string; zone:string; note:string|null; added_at:string; created_at:string; updated_at:string; archived_at:string|null }
export interface FridgeSettings { freezerTemp:number; fridgeTemp:number }
export interface Favorite { id:number; recipe_name:string; ingredients:unknown; steps:unknown; created_at:string }
export interface RecipeHistory { id:number; title:string; model_used:string; week_plan:string; created_at:string }
export interface Preferences { people_count:number; taste_preference:string; allergies:string; cuisine_style:string; days:number; height_cm:number|null; age:number|null; gender:string; activity_level:string; calorie_target:number|null }
export interface Workout { id:number; date:string; activity_type:string; duration_min:number; detail:string; created_at:string; updated_at:string; archived_at:string|null }
export interface BodyMetric { id:number; date:string; weight_kg:number; body_fat_pct:number|null; note:string; created_at:string; updated_at:string; archived_at:string|null }
export interface HealthGoal { id:number; name:string; category:string; target:string; unit:string; status:string; target_value:number|null; current_value:number|null; start_date:string|null; end_date:string|null; created_at:string; updated_at:string; archived_at:string|null }
export interface HabitLog { id:number; date:string; habit:string; value:string; created_at:string; updated_at:string; archived_at:string|null }
export interface DietLog { id:number; date:string; meal_type:string; foods:unknown; note:string; total_kcal:number|null; created_at:string; updated_at:string; archived_at:string|null }
export interface Recipe { id:number; title:string; ingredients:unknown; steps:unknown; nutrition_estimate:unknown; source:string; legacy_history_id:number|null; created_at:string; updated_at:string; archived_at:string|null }
export interface ShoppingItem { id:number; name:string; quantity:string; checked:number; created_at:string; updated_at:string; archived_at:string|null }
export interface Conversation { id:number; title:string; context:unknown; created_at:string; updated_at:string; archived_at:string|null; last_message?:string|null }
export interface Message { id:number; conversation_id:number; role:"user"|"assistant"|"system"; content:string; metadata:unknown; created_at:string }
export type AgentActionStatus="pending"|"confirmed"|"cancelled"|"undone";
export interface AgentActionProposal { id:number; conversation_id:number|null; action_type:string; payload:unknown; status:AgentActionStatus; result:unknown; undo_payload:unknown; undo_available:boolean; created_at:string; updated_at:string }
export type ScheduleType="daily"|"weekly"|"once";
export interface Schedule { id:number; conversation_id:number; title:string; message:string; schedule_type:ScheduleType; time_of_day:string; weekdays:number[]|null; fire_date:string|null; enabled:number; last_fired_at:string|null; next_fire_at:string|null; created_at:string; updated_at:string }

type PatchValue = string|number|null|undefined;
export const SECRET_SETTING_KEYS = ["openai_api_key","google_api_key","deepseek_api_key","moonshot_api_key","minimax_api_key","anthropic_api_key","dashscope_api_key","zhipu_api_key","custom_api_key"];
const parseJson = (value:unknown):unknown => { if(typeof value!=="string"||!value) return value??null; try{return JSON.parse(value)}catch{return value} };
const LATEST_SCHEMA_VERSION=10;
const validDate=(value:string)=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);const parsed=match?new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))):null;return!!match&&!!parsed&&parsed.toISOString().slice(0,10)===value};
const requireText=(field:string,value:unknown,max:number)=>{if(typeof value!=="string"||!value.trim()||value.length>max)throw new RangeError(`${field} 必须是 1 到 ${max} 个字符`)};
const requireDate=(field:string,value:unknown)=>{if(typeof value!=="string"||!validDate(value))throw new RangeError(`${field} 必须是有效的 YYYY-MM-DD 日期`)};
const requireNumber=(field:string,value:unknown,min:number,max:number,{nullable=false}={})=>{if(value===null&&nullable)return;if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${field} 必须在 ${min} 到 ${max} 之间`)};
const GOAL_STATUSES=new Set(["进行中","已完成","已暂停","已取消","active","completed","paused","cancelled"]);
const MEAL_TYPES=new Set(["早餐","午餐","晚餐","加餐"]);
const validateMealType=(value:unknown)=>{if(typeof value!=="string"||!MEAL_TYPES.has(value))throw new RangeError("meal_type 必须是早餐、午餐、晚餐或加餐")};
const validateDietFoods=(value:unknown)=>{
  if(!Array.isArray(value)||value.length<1||value.length>100)throw new RangeError("foods 必须包含 1 到 100 项食物");
  for(const item of value){
    if(!item||typeof item!=="object"||Array.isArray(item))throw new RangeError("foods 中的每一项必须是对象");
    const food=item as Record<string,unknown>;requireText("foods.name",food.name,120);
    if(food.quantity!==undefined&&food.quantity!==null&&(typeof food.quantity!=="string"||food.quantity.length>80))throw new RangeError("foods.quantity 必须是不超过 80 个字符的字符串");
    if(food.kcal!==undefined&&food.kcal!==null&&(typeof food.kcal!=="number"||!Number.isFinite(food.kcal)||food.kcal<0||food.kcal>5000))throw new RangeError("foods.kcal 必须在 0 到 5000 之间");
  }
};

/** 根据分类给出默认存放分区（肉类/水产默认冷冻，其余冷藏）。 */
export function defaultZoneForCategory(category:string):"freezer"|"fridge"{return ["肉类","水产"].includes(category)?"freezer":"fridge";}

const TIME_OF_DAY_PATTERN=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
/** 时间语义约定：time_of_day/weekdays/fire_date 均为用户本地时间；返回值为 UTC "YYYY-MM-DD HH:MM:SS"。 */
export function validateScheduleInput(d:Record<string,unknown>){
  requireText("title",d.title,120);
  requireText("message",d.message,2000);
  if(!["daily","weekly","once"].includes(String(d.schedule_type)))throw new RangeError("schedule_type 必须是 daily、weekly 或 once");
  if(typeof d.time_of_day!=="string"||!TIME_OF_DAY_PATTERN.test(d.time_of_day))throw new RangeError("time_of_day 必须是 HH:MM（24 小时制）");
  if(d.schedule_type==="weekly"){
    if(!Array.isArray(d.weekdays)||d.weekdays.length<1||d.weekdays.length>7)throw new RangeError("weekly 必须提供 1 到 7 个 weekdays（1=周一…7=周日）");
    const days=new Set((d.weekdays as unknown[]).map(v=>Number(v)));
    if(days.size!==d.weekdays.length||[...days].some(n=>!Number.isInteger(n)||n<1||n>7))throw new RangeError("weekdays 必须是 1 到 7 的整数");
  }
  if(d.schedule_type==="once"&&d.fire_date!==undefined&&d.fire_date!==null)requireDate("fire_date",d.fire_date);
}

/** 计算下一次触发时间（本地时间语义 → UTC 存储）；once 已过期时返回 null。 */
export function computeNextFire(scheduleType:ScheduleType,timeOfDay:string,weekdays:number[]|null,fireDate:string|null,from:Date):string|null{
  const [hour,minute]=timeOfDay.split(":").map(Number);
  const atTime=(day:Date)=>{const d=new Date(day.getFullYear(),day.getMonth(),day.getDate(),hour,minute,0,0);return d.getTime()>from.getTime()?d:null};
  if(scheduleType==="once"){
    if(fireDate){
      const [y,m,d]=fireDate.split("-").map(Number);
      const fired=atTime(new Date(y,m-1,d));
      return fired?utcStamp(fired):null;
    }
    const today=atTime(from);
    return today?utcStamp(today):null;
  }
  if(scheduleType==="daily"){
    const today=atTime(from);
    if(today)return utcStamp(today);
    const tomorrow=new Date(from.getFullYear(),from.getMonth(),from.getDate()+1);
    return utcStamp(new Date(tomorrow.getFullYear(),tomorrow.getMonth(),tomorrow.getDate(),hour,minute,0,0));
  }
  const wanted=new Set((weekdays??[]).map(Number));
  for(let offset=0;offset<8;offset++){
    const day=new Date(from.getFullYear(),from.getMonth(),from.getDate()+offset);
    // weekdays 约定 1=周一…7=周日；JS getDay() 0=周日
    const weekday=((day.getDay()+6)%7)+1;
    if(!wanted.has(weekday))continue;
    const fired=atTime(day);
    if(fired)return utcStamp(fired);
  }
  return null;
}
/** 本地 Date → UTC "YYYY-MM-DD HH:MM:SS"（与 SQLite datetime('now') 同口径）。 */
export function utcStamp(d:Date){return d.toISOString().slice(0,19).replace("T"," ")}

/** Versioned SQLite store. A file DB is copied before any migration runs. */
export class RecipeDB {
  private db:Database;
  private readonly databasePath:string|null;
  readonly backupPath:string|null;
  constructor(path:string){
    const existed=path!==":memory:"&&!path.startsWith("file::memory:")&&existsSync(resolve(path));
    this.databasePath=path!==":memory:"&&!path.startsWith("file::memory:")?resolve(path):null;
    this.db=new Database(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.backupPath=existed&&this.currentMigrationVersion()<LATEST_SCHEMA_VERSION?this.backup(path):null;
    this.migrate();
  }
  close(){this.db.close()}
  private backup(path:string){
    const source=resolve(path);
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    const target=`${source}.pre-migration.${stamp}.${randomUUID()}.db`;
    mkdirSync(dirname(target),{recursive:true});
    // sqlite3_serialize creates one transactionally consistent image, including committed WAL content.
    writeFileSync(target,this.db.serialize(),{flag:"wx"});
    return target;
  }
  private currentMigrationVersion(){
    const hasTable=!!this.db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if(!hasTable)return 0;
    return Number((this.db.query("SELECT COALESCE(MAX(version),0) version FROM schema_migrations").get() as {version:number}).version);
  }
  private hasColumn(table:string,column:string){return (this.db.query(`PRAGMA table_info(${table})`).all() as Array<{name:string}>).some(r=>r.name===column)}
  private addColumn(table:string,definition:string){const name=definition.split(/\s+/,1)[0]!;if(!this.hasColumn(table,name))this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)}
  private migrate(){
    this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    const applied=new Set((this.db.query("SELECT version FROM schema_migrations").all() as Array<{version:number}>).map(r=>r.version));
    const run=(version:number,name:string,fn:()=>void)=>{if(applied.has(version))return;this.db.transaction(()=>{fn();this.db.query("INSERT INTO schema_migrations(version,name) VALUES (?,?)").run(version,name)})()};
    run(1,"legacy_schema",()=>this.db.exec(`
      CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY,people_count INTEGER DEFAULT 2,taste_preference TEXT DEFAULT '家常',allergies TEXT DEFAULT '',cuisine_style TEXT DEFAULT '中餐',days INTEGER DEFAULT 7);
      CREATE TABLE IF NOT EXISTS ingredients(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,quantity TEXT,category TEXT,source TEXT DEFAULT 'manual',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS recipe_history(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,model_used TEXT,ingredients_snapshot TEXT,week_plan TEXT,nutrition_report TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS favorites(id INTEGER PRIMARY KEY AUTOINCREMENT,recipe_name TEXT NOT NULL,ingredients TEXT,steps TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
      CREATE TABLE IF NOT EXISTS workout_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT,activity_type TEXT,duration_min INTEGER,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS body_metrics(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT,weight_kg REAL,body_fat_pct REAL,note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS health_goals(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT,target TEXT,unit TEXT,status TEXT DEFAULT '进行中',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS habit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT,habit TEXT,value TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT OR IGNORE INTO preferences(id,people_count,taste_preference,allergies,cuisine_style,days) VALUES(1,2,'家常','','中餐',7);
    `));
    run(2,"v1_domain_schema",()=>{
      for(const table of ["ingredients","workout_logs","body_metrics","health_goals","habit_logs"]){this.addColumn(table,"updated_at TEXT");this.addColumn(table,"archived_at TEXT");this.db.exec(`UPDATE ${table} SET updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)`)}
      for(const col of ["target_value REAL","current_value REAL","start_date TEXT","end_date TEXT"])this.addColumn("health_goals",col);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS recipes(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,ingredients TEXT NOT NULL DEFAULT '[]',steps TEXT NOT NULL DEFAULT '[]',nutrition_estimate TEXT,source TEXT NOT NULL DEFAULT 'manual',legacy_history_id INTEGER REFERENCES recipe_history(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,archived_at TEXT);
        CREATE TABLE IF NOT EXISTS shopping_items(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,quantity TEXT NOT NULL DEFAULT '',checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN(0,1)),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,archived_at TEXT);
        CREATE TABLE IF NOT EXISTS conversations(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL DEFAULT '新对话',context TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,archived_at TEXT);
        CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN('user','assistant','system')),content TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS agent_actions(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,action_type TEXT NOT NULL,payload TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','cancelled','undone')),result TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE INDEX IF NOT EXISTS idx_ingredients_active ON ingredients(archived_at,id); CREATE INDEX IF NOT EXISTS idx_workouts_active_date ON workout_logs(archived_at,date); CREATE INDEX IF NOT EXISTS idx_body_active_date ON body_metrics(archived_at,date); CREATE INDEX IF NOT EXISTS idx_goals_active ON health_goals(archived_at,id); CREATE INDEX IF NOT EXISTS idx_habits_active_date ON habit_logs(archived_at,date); CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id,id);
        INSERT INTO recipes(title,ingredients,steps,nutrition_estimate,source,legacy_history_id,created_at,updated_at)
          SELECT COALESCE(title,'历史菜谱'),COALESCE(ingredients_snapshot,'[]'),COALESCE(week_plan,'[]'),nutrition_report,'legacy',id,created_at,created_at FROM recipe_history
          WHERE NOT EXISTS(SELECT 1 FROM recipes r WHERE r.legacy_history_id=recipe_history.id);
      `)
    });
    // Secret deletion is intentionally deferred to SettingsStore, after durable write + read-back verification.
    run(3,"credential_migration_ready",()=>{});
    run(4,"agent_action_undo",()=>{
      this.addColumn("agent_actions","undo_payload TEXT");
      this.addColumn("agent_actions","undo_available INTEGER NOT NULL DEFAULT 0");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_agent_actions_conversation ON agent_actions(conversation_id,id); CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status,id)");
    });
    run(5,"foods_diet_profile",()=>{
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS foods(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,emoji TEXT NOT NULL DEFAULT '🍽️',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS diet_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL,meal_type TEXT NOT NULL DEFAULT '早餐',foods TEXT NOT NULL DEFAULT '[]',note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,archived_at TEXT);
        CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category,id);
        CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
        CREATE INDEX IF NOT EXISTS idx_diet_logs_date ON diet_logs(archived_at,date);
      `);
      const insertFood=this.db.query("INSERT INTO foods(name,category,emoji) VALUES(?,?,?)");
      const count=(this.db.query("SELECT COUNT(*) c FROM foods").get() as {c:number}).c;
      if(count===0)for(const f of FOODS)insertFood.run(f.name,f.category,f.emoji);
      this.addColumn("preferences","height_cm REAL");
      this.addColumn("preferences","age INTEGER");
      this.addColumn("preferences","gender TEXT");
      this.addColumn("preferences","activity_level TEXT");
    });
    run(6,"food_units",()=>{
      this.addColumn("foods","unit TEXT NOT NULL DEFAULT '份'");
      const upd=this.db.query("UPDATE foods SET unit=? WHERE name=?");
      for(const f of FOODS) upd.run(unitFor(f.name,f.category),f.name);
    });
    // 冰箱分区 + 存放时间：支持冷冻/冷藏两舱与保鲜估算
    run(7,"fridge_zones",()=>{
      // 注意：部分 SQLite 构建不允许 ALTER TABLE ADD COLUMN 使用 DEFAULT CURRENT_TIMESTAMP
      // （报错 "Cannot add a column with non-constant default"）。因此先加可空列，
      // 再用常量/'now' 回填，保证对历史数据兼容且迁移可重复执行。
      this.addColumn("ingredients","zone TEXT");
      this.addColumn("ingredients","added_at TEXT");
      this.db.exec("UPDATE ingredients SET zone='fridge' WHERE zone IS NULL OR zone=''");
      this.db.exec("UPDATE ingredients SET added_at=datetime('now') WHERE added_at IS NULL OR added_at=''");
    });
    run(8,"ingredient_notes",()=>{
      this.addColumn("ingredients","note TEXT");
    });
    // 定时任务/自动化：时间语义均为用户本地时间，next_fire_at 存 UTC 以便与 datetime('now') 比较
    run(9,"schedules",()=>{
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schedules(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          schedule_type TEXT NOT NULL DEFAULT 'daily' CHECK(schedule_type IN('daily','weekly','once')),
          time_of_day TEXT NOT NULL,
          weekdays TEXT,
          fire_date TEXT,
          enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
          last_fired_at TEXT,
          next_fire_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_schedules_due ON schedules(enabled,next_fire_at);
      `);
    });
    // 营养量化：foods 按内置表回填每 100g 营养；饮食记录自动计算总热量；
    // preferences.calorie_target 为手动覆盖值（空=按身体数据自动推算）。
    run(10,"nutrition_layer",()=>{
      this.addColumn("foods","kcal REAL");
      this.addColumn("foods","protein REAL");
      this.addColumn("foods","fat REAL");
      this.addColumn("foods","carb REAL");
      this.addColumn("diet_logs","total_kcal REAL");
      this.addColumn("preferences","calorie_target INTEGER");
      const upd=this.db.query("UPDATE foods SET kcal=?,protein=?,fat=?,carb=? WHERE name=?");
      for(const f of FOODS){
        const p=FOOD_NUTRITION[f.name];
        if(p)upd.run(p.kcal,p.protein,p.fat,p.carb,f.name);
      }
    });
  }
  getMigrationVersion(){return Number((this.db.query("SELECT COALESCE(MAX(version),0) version FROM schema_migrations").get() as {version:number}).version)}
  getTableNames(){return (this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{name:string}>).map(r=>r.name)}
  private one(table:string,id:number){return (this.db.query(`SELECT * FROM ${table} WHERE id=? AND archived_at IS NULL`).get(id) as Record<string,unknown>|null)??null}
  private patch(table:string,id:number,patch:Record<string,PatchValue>,allowed:string[]){const e=Object.entries(patch).filter(([k,v])=>allowed.includes(k)&&v!==undefined);if(!e.length)return!!this.one(table,id);return this.db.query(`UPDATE ${table} SET ${e.map(([k])=>`${k}=?`).join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=? AND archived_at IS NULL`).run(...e.map(([,v])=>v??null),id).changes>0}
  private archive(table:string,id:number){return this.db.query(`UPDATE ${table} SET archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND archived_at IS NULL`).run(id).changes>0}
  private unarchive(table:string,id:number){return this.db.query(`UPDATE ${table} SET archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND archived_at IS NOT NULL`).run(id).changes>0}

  addIngredient(name:string,quantity:string,category:string,source="manual",zone?:string,addedAt?:string,note?:string){const z=zone||defaultZoneForCategory(category);const ts=addedAt??new Date().toISOString().slice(0,19).replace("T"," ");return Number(this.db.query("INSERT INTO ingredients(name,quantity,category,source,zone,added_at,note,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").run(name,quantity,category,source,z,ts,note??null).lastInsertRowid)}
  getIngredients(){return this.db.query("SELECT * FROM ingredients WHERE archived_at IS NULL ORDER BY created_at DESC,id DESC").all() as Ingredient[]}
  getIngredient(id:number){return this.one("ingredients",id) as unknown as Ingredient|null}
  updateIngredient(id:number,p:Partial<Ingredient>){return this.patch("ingredients",id,p as Record<string,PatchValue>,["name","quantity","category","source","zone","added_at","note"])}
  archiveIngredient(id:number){return this.archive("ingredients",id)}
  deleteIngredient(id:number){this.db.query("DELETE FROM ingredients WHERE id=?").run(id)}
  clearIngredients(){this.db.query("DELETE FROM ingredients").run()}

  addRecipeHistory(title:string,model:string,plan:string){return Number(this.db.query("INSERT INTO recipe_history(title,model_used,week_plan) VALUES(?,?,?)").run(title,model,plan).lastInsertRowid)}
  getRecipeHistory(){return this.db.query("SELECT id,title,model_used,COALESCE(week_plan,'') week_plan,created_at FROM recipe_history ORDER BY created_at DESC").all() as RecipeHistory[]}
  addFavorite(name:string,ingredients:unknown,steps:unknown){return Number(this.db.query("INSERT INTO favorites(recipe_name,ingredients,steps) VALUES(?,?,?)").run(name,JSON.stringify(ingredients),JSON.stringify(steps)).lastInsertRowid)}
  getFavorites(){return (this.db.query("SELECT * FROM favorites ORDER BY created_at DESC").all() as Array<Record<string,unknown>>).map(r=>({...r,ingredients:parseJson(r.ingredients),steps:parseJson(r.steps)}) as unknown as Favorite)}
  getFavorite(id:number){const r=this.db.query("SELECT * FROM favorites WHERE id=?").get(id) as Record<string,unknown>|null;return r?{...r,ingredients:parseJson(r.ingredients),steps:parseJson(r.steps)} as unknown as Favorite:null}
  deleteFavorite(id:number){this.db.query("DELETE FROM favorites WHERE id=?").run(id)}
  /** 聚合导出用户全部健康数据（仅读取，供数据导出端点使用）。 */
  getExportBundle(){
    return {
      exportedAt:new Date().toISOString(),
      schemaVersion:this.getMigrationVersion(),
      preferences:this.getPreferences(),
      ingredients:this.getIngredients(),
      favorites:this.getFavorites(),
      recipeHistory:this.getRecipeHistory(),
      recipes:this.getRecipes(),
      workouts:this.getWorkouts(),
      bodyMetrics:this.getBodyMetrics(),
      goals:this.getGoals(),
      habits:this.getHabits(),
      dietLogs:this.getDietLogs(),
      shoppingItems:this.getShoppingItems(),
      conversations:this.getConversations(),
    };
  }

  getPreferences():Preferences{const r=this.db.query("SELECT * FROM preferences WHERE id=1").get() as Record<string,unknown>|null;return r?{people_count:Number(r.people_count),taste_preference:String(r.taste_preference),allergies:String(r.allergies),cuisine_style:String(r.cuisine_style),days:Number(r.days),height_cm:r.height_cm==null?null:Number(r.height_cm),age:r.age==null?null:Number(r.age),gender:String(r.gender??""),activity_level:String(r.activity_level??"久坐"),calorie_target:r.calorie_target==null?null:Number(r.calorie_target)}:{people_count:2,taste_preference:"家常",allergies:"",cuisine_style:"中餐",days:7,height_cm:null,age:null,gender:"",activity_level:"久坐",calorie_target:null}}
  updatePreferences(p:Partial<Preferences>){
    if(p.people_count!==undefined)requireNumber("people_count",p.people_count,1,20);
    if(p.days!==undefined)requireNumber("days",p.days,1,31);
    if(p.height_cm!==undefined)requireNumber("height_cm",p.height_cm,80,250,{nullable:true});
    if(p.age!==undefined)requireNumber("age",p.age,1,120,{nullable:true});
    if(p.calorie_target!==undefined)requireNumber("calorie_target",p.calorie_target,800,6000,{nullable:true});
    for(const [field,max,allowEmpty] of [["taste_preference",200,false],["allergies",1000,true],["cuisine_style",120,false],["gender",20,true],["activity_level",40,true]] as const){
      const value=p[field];
      if(value!==undefined&&(typeof value!=="string"||(!allowEmpty&&!value.trim())||value.length>max))throw new RangeError(`${field} 不符合长度要求`);
    }
    const allowed=["people_count","taste_preference","allergies","cuisine_style","days","height_cm","age","gender","activity_level","calorie_target"];
    const e=Object.entries(p).filter(([k,v])=>allowed.includes(k)&&v!==undefined);
    if(e.length)this.db.query(`UPDATE preferences SET ${e.map(([k])=>`${k}=?`).join(",")} WHERE id=1`).run(...e.map(([,v])=>v as string|number|null));
  }
  getSetting(key:string){return (this.db.query("SELECT value FROM settings WHERE key=?").get(key) as {value:string}|null)?.value}
  setSetting(key:string,value:string){if(SECRET_SETTING_KEYS.includes(key))throw new Error("Secret settings cannot be persisted in SQLite");this.db.query("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,value)}
  /** 冰箱双舱目标温度（°C）；未设置时冷冻 -18、冷藏 4。 */
  getFridgeSettings():FridgeSettings{const raw=this.getSetting("fridge_settings");if(!raw)return{freezerTemp:-18,fridgeTemp:4};try{const p=JSON.parse(raw);return{freezerTemp:typeof p.freezerTemp==="number"?p.freezerTemp:-18,fridgeTemp:typeof p.fridgeTemp==="number"?p.fridgeTemp:4}}catch{return{freezerTemp:-18,fridgeTemp:4}}}
  setFridgeSettings(s:FridgeSettings){const freezerTemp=Number.isFinite(s.freezerTemp)?s.freezerTemp:-18;const fridgeTemp=Number.isFinite(s.fridgeTemp)?s.fridgeTemp:4;this.setSetting("fridge_settings",JSON.stringify({freezerTemp,fridgeTemp}))}
  deleteSetting(key:string){this.db.query("DELETE FROM settings WHERE key=?").run(key)}
  getMigrationBackupPaths(){
    if(!this.databasePath)return[];
    const dir=dirname(this.databasePath),prefix=`${basename(this.databasePath)}.pre-migration.`;
    return readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.startsWith(prefix)&&entry.name.endsWith(".db")).map(entry=>join(dir,entry.name)).sort();
  }
  /** Remove one migrated secret from the live DB and every backup, rolling deletions back if any file fails. */
  deleteSecretSettingEverywhere(key:string){
    if(!SECRET_SETTING_KEYS.includes(key))throw new Error("Not a secret setting");
    const stores:Array<{db:Database;owned:boolean;hasSettings:boolean;value:string|undefined}>=[{db:this.db,owned:false,hasSettings:true,value:this.getSetting(key)}];
    try{
      for(const path of this.getMigrationBackupPaths()){
        const backup=new Database(path);
        const hasSettings=!!backup.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get();
        const value=hasSettings?(backup.query("SELECT value FROM settings WHERE key=?").get(key) as {value:string}|null)?.value:undefined;
        stores.push({db:backup,owned:true,hasSettings,value});
      }
      for(const store of stores)if(store.hasSettings)store.db.query("DELETE FROM settings WHERE key=?").run(key);
    }catch(error){
      for(const store of stores){
        if(!store.hasSettings||store.value===undefined)continue;
        try{store.db.query("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,store.value)}catch{}
      }
      throw error;
    }finally{
      for(const store of stores)if(store.owned)store.db.close();
    }
  }

  addWorkout(date:string,type:string,duration:number,detail:string){requireDate("date",date);requireText("activity_type",type,120);requireNumber("duration_min",duration,1,1440);if(typeof detail!=="string"||detail.length>2000)throw new RangeError("detail 最多 2000 个字符");return Number(this.db.query("INSERT INTO workout_logs(date,activity_type,duration_min,detail,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").run(date,type,duration,detail).lastInsertRowid)}
  getWorkouts(){return this.db.query("SELECT * FROM workout_logs WHERE archived_at IS NULL ORDER BY date DESC,id DESC").all() as Workout[]}
  getWorkout(id:number){return this.one("workout_logs",id) as unknown as Workout|null}
  updateWorkout(id:number,p:Partial<Workout>){if(p.date!==undefined)requireDate("date",p.date);if(p.activity_type!==undefined)requireText("activity_type",p.activity_type,120);if(p.duration_min!==undefined)requireNumber("duration_min",p.duration_min,1,1440);if(p.detail!==undefined&&(typeof p.detail!=="string"||p.detail.length>2000))throw new RangeError("detail 最多 2000 个字符");return this.patch("workout_logs",id,p as Record<string,PatchValue>,["date","activity_type","duration_min","detail"])}
  archiveWorkout(id:number){return this.archive("workout_logs",id)}

  addBodyMetric(date:string,weight:number,fat:number|null,note:string){requireDate("date",date);requireNumber("weight_kg",weight,20,500);requireNumber("body_fat_pct",fat,1,75,{nullable:true});if(typeof note!=="string"||note.length>1000)throw new RangeError("note 最多 1000 个字符");return Number(this.db.query("INSERT INTO body_metrics(date,weight_kg,body_fat_pct,note,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").run(date,weight,fat,note).lastInsertRowid)}
  getBodyMetrics(){return this.db.query("SELECT * FROM body_metrics WHERE archived_at IS NULL ORDER BY date DESC,id DESC").all() as BodyMetric[]}
  getBodyMetric(id:number){return this.one("body_metrics",id) as unknown as BodyMetric|null}
  updateBodyMetric(id:number,p:Partial<BodyMetric>){if(p.date!==undefined)requireDate("date",p.date);if(p.weight_kg!==undefined)requireNumber("weight_kg",p.weight_kg,20,500);if(p.body_fat_pct!==undefined)requireNumber("body_fat_pct",p.body_fat_pct,1,75,{nullable:true});if(p.note!==undefined&&(typeof p.note!=="string"||p.note.length>1000))throw new RangeError("note 最多 1000 个字符");return this.patch("body_metrics",id,p as Record<string,PatchValue>,["date","weight_kg","body_fat_pct","note"])}
  archiveBodyMetric(id:number){return this.archive("body_metrics",id)}

  addGoal(name:string,category:string,target:string,unit:string){return this.createGoal({name,category,target,unit})}
  createGoal(d:Record<string,PatchValue>){this.validateGoal(d,true);return Number(this.db.query("INSERT INTO health_goals(name,category,target,unit,status,target_value,current_value,start_date,end_date,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").run(String(d.name??""),d.category??"",d.target??"",d.unit??"",d.status??"进行中",d.target_value??null,d.current_value??null,d.start_date??null,d.end_date??null).lastInsertRowid)}
  getGoals(){return this.db.query("SELECT * FROM health_goals WHERE archived_at IS NULL ORDER BY id DESC").all() as HealthGoal[]}
  getGoal(id:number){return this.one("health_goals",id) as unknown as HealthGoal|null}
  private validateGoal(d:Record<string,PatchValue>,required=false){if(required||d.name!==undefined)requireText("name",d.name,120);for(const [field,max] of [["category",80],["target",200],["unit",40]] as const){const value=d[field];if(value!==undefined&&(typeof value!=="string"||value.length>max))throw new RangeError(`${field} 最多 ${max} 个字符`)}if(d.status!==undefined&&(typeof d.status!=="string"||!GOAL_STATUSES.has(d.status)))throw new RangeError("status 不是支持的目标状态");for(const field of ["target_value","current_value"] as const)if(d[field]!==undefined)requireNumber(field,d[field],0,1e9,{nullable:true});for(const field of ["start_date","end_date"] as const)if(d[field]!==undefined&&d[field]!==null)requireDate(field,d[field]);if(typeof d.start_date==="string"&&typeof d.end_date==="string"&&d.start_date>d.end_date)throw new RangeError("end_date 不能早于 start_date")}
  updateGoal(id:number,p:Partial<HealthGoal>){this.validateGoal(p as Record<string,PatchValue>);return this.patch("health_goals",id,p as Record<string,PatchValue>,["name","category","target","unit","status","target_value","current_value","start_date","end_date"])}
  archiveGoal(id:number){return this.archive("health_goals",id)}
  updateGoalStatus(name:string,status:string){requireText("name",name,120);if(!GOAL_STATUSES.has(status))throw new RangeError("status 不是支持的目标状态");this.db.query("UPDATE health_goals SET status=?,updated_at=CURRENT_TIMESTAMP WHERE name=? AND archived_at IS NULL").run(status,name)}

  addHabit(date:string,habit:string,value:string){requireDate("date",date);requireText("habit",habit,120);requireText("value",value,200);return Number(this.db.query("INSERT INTO habit_logs(date,habit,value,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)").run(date,habit,value).lastInsertRowid)}
  getHabits(){return this.db.query("SELECT * FROM habit_logs WHERE archived_at IS NULL ORDER BY date DESC,id DESC").all() as HabitLog[]}
  getHabit(id:number){return this.one("habit_logs",id) as unknown as HabitLog|null}
  updateHabit(id:number,p:Partial<HabitLog>){if(p.date!==undefined)requireDate("date",p.date);if(p.habit!==undefined)requireText("habit",p.habit,120);if(p.value!==undefined)requireText("value",p.value,200);return this.patch("habit_logs",id,p as Record<string,PatchValue>,["date","habit","value"])}
  archiveHabit(id:number){return this.archive("habit_logs",id)}

  createRecipe(d:{title:string;ingredients?:unknown;steps?:unknown;nutrition_estimate?:unknown;source?:string}){return Number(this.db.query("INSERT INTO recipes(title,ingredients,steps,nutrition_estimate,source) VALUES(?,?,?,?,?)").run(d.title,JSON.stringify(d.ingredients??[]),JSON.stringify(d.steps??[]),d.nutrition_estimate==null?null:JSON.stringify(d.nutrition_estimate),d.source??"manual").lastInsertRowid)}
  private recipe(r:Record<string,unknown>){return {...r,ingredients:parseJson(r.ingredients),steps:parseJson(r.steps),nutrition_estimate:parseJson(r.nutrition_estimate)} as unknown as Recipe}
  getRecipes(){return (this.db.query("SELECT * FROM recipes WHERE archived_at IS NULL ORDER BY id DESC").all() as Array<Record<string,unknown>>).map(r=>this.recipe(r))}
  getRecipe(id:number){const r=this.one("recipes",id);return r?this.recipe(r):null}
  updateRecipe(id:number,p:Partial<Recipe>){const d={...p,ingredients:p.ingredients===undefined?undefined:JSON.stringify(p.ingredients),steps:p.steps===undefined?undefined:JSON.stringify(p.steps),nutrition_estimate:p.nutrition_estimate===undefined?undefined:JSON.stringify(p.nutrition_estimate)};return this.patch("recipes",id,d as Record<string,PatchValue>,["title","ingredients","steps","nutrition_estimate","source"])}
  archiveRecipe(id:number){return this.archive("recipes",id)}

  createShoppingItem(name:string,quantity:string,checked=false){requireText("name",name,120);if(typeof quantity!=="string"||quantity.length>80)throw new RangeError("quantity 最多 80 个字符");if(typeof checked!=="boolean")throw new TypeError("checked 必须为布尔值");return Number(this.db.query("INSERT INTO shopping_items(name,quantity,checked) VALUES(?,?,?)").run(name,quantity,checked?1:0).lastInsertRowid)}
  getShoppingItems(){return this.db.query("SELECT * FROM shopping_items WHERE archived_at IS NULL ORDER BY checked,id DESC").all() as ShoppingItem[]}
  getShoppingItem(id:number){return this.one("shopping_items",id) as unknown as ShoppingItem|null}
  updateShoppingItem(id:number,p:Partial<ShoppingItem>){if(p.name!==undefined)requireText("name",p.name,120);if(p.quantity!==undefined&&(typeof p.quantity!=="string"||p.quantity.length>80))throw new RangeError("quantity 最多 80 个字符");if(p.checked!==undefined&&p.checked!==0&&p.checked!==1)throw new TypeError("checked 必须为 0 或 1");return this.patch("shopping_items",id,p as Record<string,PatchValue>,["name","quantity","checked"])}
  archiveShoppingItem(id:number){return this.archive("shopping_items",id)}

  createConversation(title="新对话",context:unknown={}){return Number(this.db.query("INSERT INTO conversations(title,context) VALUES(?,?)").run(title,JSON.stringify(context)).lastInsertRowid)}
  private conversation(r:Record<string,unknown>){return {...r,context:parseJson(r.context)} as unknown as Conversation}
  getConversations(){
    // 附带最新一条消息预览（截 60 字），供会话列表卡片展示
    const rows=this.db.query(`SELECT c.*, (SELECT substr(m.content,1,60) FROM messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_message FROM conversations c WHERE c.archived_at IS NULL ORDER BY c.updated_at DESC,c.id DESC`).all() as Array<Record<string,unknown>>;
    return rows.map(r=>this.conversation(r));
  }
  getConversation(id:number){const r=this.one("conversations",id);return r?this.conversation(r):null}
  archiveConversation(id:number){return this.archive("conversations",id)}
  renameConversation(id:number,title:string){requireText("title",title,120);return this.patch("conversations",id,{title},["title"])}
  addMessage(conversationId:number,role:Message["role"],content:string,metadata:unknown={}){const id=Number(this.db.query("INSERT INTO messages(conversation_id,role,content,metadata) VALUES(?,?,?,?)").run(conversationId,role,content,JSON.stringify(metadata)).lastInsertRowid);this.db.query("UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?").run(conversationId);return id}
  getMessages(conversationId:number,limit=100,beforeId?:number){const rows=beforeId?this.db.query("SELECT * FROM messages WHERE conversation_id=? AND id<? ORDER BY id DESC LIMIT ?").all(conversationId,beforeId,limit):this.db.query("SELECT * FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT ?").all(conversationId,limit);return(rows as Array<Record<string,unknown>>).reverse().map(r=>({...r,metadata:parseJson(r.metadata)}) as unknown as Message)}
  getOrCreateLegacyConversation(){
    const existing=this.db.query("SELECT id FROM conversations WHERE archived_at IS NULL AND json_extract(context,'$.legacy')=1 ORDER BY id LIMIT 1").get() as {id:number}|null;
    return existing?.id??this.createConversation("兼容聊天",{legacy:true});
  }

  private schedule(r:Record<string,unknown>):Schedule{return {...r,weekdays:parseJson(r.weekdays) as number[]|null,enabled:Number(r.enabled)} as unknown as Schedule}
  createSchedule(d:{conversationId:number;title:string;message:string;scheduleType:ScheduleType;timeOfDay:string;weekdays?:number[]|null;fireDate?:string|null}){
    // 工具与 API 都可能传入模型生成的参数，格式校验必须在存储层兜底
    validateScheduleInput({title:d.title,message:d.message,schedule_type:d.scheduleType,time_of_day:d.timeOfDay,weekdays:d.weekdays??null,fire_date:d.fireDate??null});
    const next=computeNextFire(d.scheduleType,d.timeOfDay,d.weekdays??null,d.fireDate??null,new Date());
    if(!next)throw new RangeError("指定的触发时间已过去，请选择未来的时间");
    return Number(this.db.query("INSERT INTO schedules(conversation_id,title,message,schedule_type,time_of_day,weekdays,fire_date,next_fire_at) VALUES(?,?,?,?,?,?,?,?)").run(d.conversationId,d.title,d.message,d.scheduleType,d.timeOfDay,d.weekdays?JSON.stringify(d.weekdays):null,d.fireDate??null,next).lastInsertRowid);
  }
  getSchedules(){return (this.db.query("SELECT * FROM schedules ORDER BY enabled DESC,next_fire_at,id").all() as Array<Record<string,unknown>>).map(r=>this.schedule(r))}
  getSchedule(id:number){const r=this.db.query("SELECT * FROM schedules WHERE id=?").get(id) as Record<string,unknown>|null;return r?this.schedule(r):null}
  updateSchedule(id:number,p:{title?:string;message?:string;schedule_type?:ScheduleType;time_of_day?:string;weekdays?:number[]|null;fire_date?:string|null;enabled?:number}){
    const current=this.getSchedule(id);if(!current)return false;
    const merged={title:p.title??current.title,message:p.message??current.message,schedule_type:(p.schedule_type??current.schedule_type) as ScheduleType,time_of_day:p.time_of_day??current.time_of_day,weekdays:p.weekdays!==undefined?p.weekdays:current.weekdays,fire_date:p.fire_date!==undefined?p.fire_date:current.fire_date};
    validateScheduleInput(merged);
    const recompute="schedule_type" in p||"time_of_day" in p||"weekdays" in p||"fire_date" in p||(p.enabled===1&&(!current.next_fire_at||current.next_fire_at<=utcStamp(new Date())));
    const nextFire=recompute?computeNextFire(merged.schedule_type,merged.time_of_day,merged.weekdays??null,merged.fire_date??null,new Date()):current.next_fire_at;
    if(recompute&&!nextFire)throw new RangeError("指定的触发时间已过去，请选择未来的时间");
    const sets:string[]=[],vals:Array<string|number|null>=[];
    for(const [k,v] of Object.entries(p)){if(v===undefined||k==="weekdays")continue;sets.push(`${k}=?`);vals.push(v as string|number)}
    if("weekdays" in p){sets.push("weekdays=?");vals.push(p.weekdays?JSON.stringify(p.weekdays):null)}
    if(recompute){sets.push("next_fire_at=?");vals.push(nextFire)}
    if(!sets.length)return true;
    return this.db.query(`UPDATE schedules SET ${sets.join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...vals,id).changes>0;
  }
  deleteSchedule(id:number){return this.db.query("DELETE FROM schedules WHERE id=?").run(id).changes>0}
  dueSchedules(nowUtc:string){return (this.db.query("SELECT * FROM schedules WHERE enabled=1 AND next_fire_at IS NOT NULL AND next_fire_at<=? ORDER BY next_fire_at").all(nowUtc) as Array<Record<string,unknown>>).map(r=>this.schedule(r))}
  /** 记录一次触发并推进 next_fire_at；once 或无下一次时自动停用。 */
  markScheduleFired(id:number,firedAt:Date){
    const current=this.getSchedule(id);if(!current)return null;
    if(current.schedule_type==="once"){this.db.query("UPDATE schedules SET enabled=0,last_fired_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(utcStamp(firedAt),id)}
    else{
      const next=computeNextFire(current.schedule_type,current.time_of_day,current.weekdays,current.fire_date,firedAt);
      if(next)this.db.query("UPDATE schedules SET last_fired_at=?,next_fire_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(utcStamp(firedAt),next,id);
      else this.db.query("UPDATE schedules SET enabled=0,last_fired_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(utcStamp(firedAt),id);
    }
    return this.getSchedule(id);
  }

  private action(r:Record<string,unknown>):AgentActionProposal{return{...r,payload:parseJson(r.payload),result:parseJson(r.result),undo_payload:parseJson(r.undo_payload),undo_available:Boolean(r.undo_available)} as unknown as AgentActionProposal}
  createAgentAction(conversationId:number|null,actionType:string,payload:unknown){
    const id=Number(this.db.query("INSERT INTO agent_actions(conversation_id,action_type,payload) VALUES(?,?,?)").run(conversationId,actionType,JSON.stringify(payload??{})).lastInsertRowid);
    return this.getAgentAction(id)!;
  }
  getAgentAction(id:number){const r=this.db.query("SELECT * FROM agent_actions WHERE id=?").get(id) as Record<string,unknown>|null;return r?this.action(r):null}
  getAgentActions(filters:{conversationId?:number;status?:AgentActionStatus}={}){
    const where:string[]=[],params:Array<string|number>=[];
    if(filters.conversationId!==undefined){where.push("conversation_id=?");params.push(filters.conversationId)}
    if(filters.status!==undefined){where.push("status=?");params.push(filters.status)}
    const rows=this.db.query(`SELECT * FROM agent_actions${where.length?` WHERE ${where.join(" AND ")}`:""} ORDER BY id DESC`).all(...params) as Array<Record<string,unknown>>;
    return rows.map(r=>this.action(r));
  }
  cancelAgentAction(id:number){
    return this.db.transaction(()=>{
      const action=this.getAgentAction(id);if(!action)return null;
      if(action.status==="cancelled")return action;
      if(action.status!=="pending")throw new RangeError(`操作处于 ${action.status} 状态，不能取消`);
      this.db.query("UPDATE agent_actions SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(id);
      return this.getAgentAction(id);
    })();
  }
  confirmAgentAction(id:number){
    return this.db.transaction(()=>{
      const action=this.getAgentAction(id);if(!action)return null;
      if(action.status==="confirmed"||action.status==="undone")return action;
      if(action.status!=="pending")throw new RangeError(`操作处于 ${action.status} 状态，不能确认`);
      const outcome=this.executeProposedAction(action.action_type,action.payload as Record<string,unknown>);
      this.db.query("UPDATE agent_actions SET status='confirmed',result=?,undo_payload=?,undo_available=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(JSON.stringify(outcome.result??null),JSON.stringify(outcome.undo??null),outcome.undoAvailable?1:0,id);
      return this.getAgentAction(id);
    })();
  }
  undoAgentAction(id:number){
    return this.db.transaction(()=>{
      const action=this.getAgentAction(id);if(!action)return null;
      if(action.status==="undone")return action;
      if(action.status!=="confirmed")throw new RangeError(`操作处于 ${action.status} 状态，不能撤销`);
      if(!action.undo_available)throw new RangeError("该操作不可撤销");
      this.executeUndo(action.action_type,action.undo_payload as Record<string,unknown>);
      this.db.query("UPDATE agent_actions SET status='undone',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='confirmed'").run(id);
      return this.getAgentAction(id);
    })();
  }
  private executeProposedAction(type:string,p:Record<string,unknown>):{result:unknown;undo:unknown;undoAvailable:boolean}{
    if(type==="save_ingredients"){
      const ids:number[]=[];for(const raw of Array.isArray(p.ingredients)?p.ingredients:[]){if(!raw||typeof raw!=="object")continue;const i=raw as Record<string,unknown>;const name=String(i.name??"").trim();if(name)ids.push(this.addIngredient(name,String(i.quantity??"若干"),String(i.category??"其他"),"agent"))}
      return{result:{ids,count:ids.length},undo:{ids},undoAvailable:true};
    }
    if(type==="clear_ingredients"){
      const ids=this.getIngredients().map(i=>i.id);for(const itemId of ids)this.archiveIngredient(itemId);return{result:{count:ids.length},undo:{ids},undoAvailable:true};
    }
    if(type==="save_favorite"){
      const id=this.addFavorite(String(p.recipe_name??""),p.ingredients??[],p.steps??[]);return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="delete_favorite"){
      const target=this.getFavorites().find(f=>f.recipe_name===String(p.recipe_name??""));if(!target)throw new RangeError("收藏不存在");this.deleteFavorite(target.id);return{result:{id:target.id},undo:null,undoAvailable:false};
    }
    if(type==="save_recipe_history"){
      const id=this.addRecipeHistory(String(p.title??""),"agent",String(p.content??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="update_preferences"){
      const previous=this.getPreferences();this.updatePreferences(p as Partial<Preferences>);return{result:this.getPreferences(),undo:previous,undoAvailable:true};
    }
    if(type==="log_workout"){
      const id=this.addWorkout(String(p.date??new Date().toISOString().slice(0,10)),String(p.activity_type??""),Number(p.duration_min??30),String(p.detail??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="log_body_metric"){
      const id=this.addBodyMetric(String(p.date??new Date().toISOString().slice(0,10)),Number(p.weight_kg),p.body_fat_pct==null?null:Number(p.body_fat_pct),String(p.note??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="set_goal"){
      const id=this.addGoal(String(p.name??""),String(p.category??"健康"),String(p.target??""),String(p.unit??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="update_goal_status"){
      const matches=this.getGoals().filter(g=>g.name===String(p.name??""));if(!matches.length)throw new RangeError("目标不存在");for(const goal of matches)this.updateGoal(goal.id,{status:String(p.status??"")});return{result:{ids:matches.map(g=>g.id)},undo:{goals:matches.map(g=>({id:g.id,status:g.status}))},undoAvailable:true};
    }
    if(type==="log_habit"){
      const id=this.addHabit(String(p.date??new Date().toISOString().slice(0,10)),String(p.habit??""),String(p.value??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="log_diet"){
      const id=this.addDietLog(String(p.date??new Date().toISOString().slice(0,10)),String(p.meal_type??"早餐"),p.foods??[],String(p.note??""));return{result:{id},undo:{id},undoAvailable:true};
    }
    if(type==="delete_schedule"){
      const target=this.getSchedule(Number(p.id));
      if(!target)throw new RangeError("定时任务不存在");
      this.deleteSchedule(target.id);
      return{result:{id:target.id},undo:target,undoAvailable:true};
    }
    throw new RangeError(`不支持的操作类型：${type}`);
  }
  private executeUndo(type:string,undo:Record<string,unknown>){
    const id=Number(undo.id);
    if(type==="save_ingredients"){for(const itemId of Array.isArray(undo.ids)?undo.ids.map(Number):[])this.archiveIngredient(itemId);return}
    if(type==="clear_ingredients"){for(const itemId of Array.isArray(undo.ids)?undo.ids.map(Number):[])this.unarchive("ingredients",itemId);return}
    if(type==="save_favorite"){this.deleteFavorite(id);return}
    if(type==="save_recipe_history"){this.db.query("DELETE FROM recipe_history WHERE id=?").run(id);return}
    if(type==="update_preferences"){this.updatePreferences(undo as unknown as Preferences);return}
    if(type==="log_workout"){this.archiveWorkout(id);return}
    if(type==="log_body_metric"){this.archiveBodyMetric(id);return}
    if(type==="set_goal"){this.archiveGoal(id);return}
    if(type==="update_goal_status"){for(const raw of Array.isArray(undo.goals)?undo.goals:[]){const g=raw as {id:number;status:string};this.updateGoal(Number(g.id),{status:g.status})}return}
    if(type==="log_habit"){this.archiveHabit(id);return}
    if(type==="log_diet"){this.archiveDietLog(id);return}
    if(type==="delete_schedule"){
      // 撤销删除：按快照原样重建（新 id），保留触发配置
      const s=undo as unknown as Schedule;
      if(!s?.title)return;
      this.db.query("INSERT INTO schedules(conversation_id,title,message,schedule_type,time_of_day,weekdays,fire_date,enabled,last_fired_at,next_fire_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(s.conversation_id,s.title,s.message,s.schedule_type,s.time_of_day,s.weekdays?JSON.stringify(s.weekdays):null,s.fire_date??null,s.enabled,s.last_fired_at??null,s.next_fire_at??null);
      return;
    }
    throw new RangeError("该操作不可撤销");
  }
  searchFoods(query:string,category?:string){const q=query.trim();let sql="SELECT id,name,category,emoji,unit,kcal,protein,fat,carb FROM foods";const cond:string[]=[],params:string[]=[];if(q){cond.push("name LIKE ?");params.push(`%${q}%`);}if(category){cond.push("category=?");params.push(category);}if(cond.length)sql+=" WHERE "+cond.join(" AND ");sql+=" ORDER BY category,id LIMIT 500";return this.db.query(sql).all(...params) as Array<{id:number;name:string;category:string;emoji:string;unit:string;kcal:number|null;protein:number|null;fat:number|null;carb:number|null}>}
  getFoodCategories(){return FOOD_CATEGORIES}
  /** 逐项注入克数/热量/宏量（内置表精确匹配，表外按中性口径估算），并汇总总热量。 */
  private enrichDietFoods(foods:unknown):{items:unknown[];totalKcal:number;protein:number;fat:number;carb:number}{
    let totalKcal=0,protein=0,fat=0,carb=0;
    const items=(foods as Array<Record<string,unknown>>).map(item=>{
      const name=String(item.name??"");
      const quantity=item.quantity==null?undefined:String(item.quantity);
      const grams=estimateItemNutrition(name,quantity).grams;
      if(typeof item.kcal==="number"&&Number.isFinite(item.kcal)){
        totalKcal+=item.kcal;
        return {name,quantity,grams,kcal:Math.round(item.kcal),source:"estimate"};
      }
      const est=estimateItemNutrition(name,quantity);
      totalKcal+=est.kcal??0;
      protein+=est.protein??0;fat+=est.fat??0;carb+=est.carb??0;
      return {name,quantity,grams,kcal:est.kcal,protein:est.protein,fat:est.fat,carb:est.carb,source:est.source};
    });
    return {items,totalKcal:Math.round(totalKcal),protein:Math.round(protein*10)/10,fat:Math.round(fat*10)/10,carb:Math.round(carb*10)/10};
  }
  addDietLog(date:string,mealType:string,foods:unknown,note:string){
    requireDate("date",date);validateMealType(mealType);validateDietFoods(foods);
    if(typeof note!=="string"||note.length>2000)throw new RangeError("note 必须是不超过 2000 个字符的字符串");
    const enriched=this.enrichDietFoods(foods);
    return Number(this.db.query("INSERT INTO diet_logs(date,meal_type,foods,note,total_kcal,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)").run(date,mealType,JSON.stringify(enriched.items),note,enriched.totalKcal).lastInsertRowid);
  }
  getDietLogs(){return (this.db.query("SELECT * FROM diet_logs WHERE archived_at IS NULL ORDER BY date DESC,id DESC").all() as Array<Record<string,unknown>>).map(r=>({...r,foods:parseJson(r.foods)}) as unknown as DietLog)}
  getDietLog(id:number){const r=this.one("diet_logs",id);return r?{...r,foods:parseJson(r.foods)} as unknown as DietLog:null}
  updateDietLog(id:number,p:Partial<DietLog>){
    if(p.date!==undefined)requireDate("date",p.date);if(p.meal_type!==undefined)validateMealType(p.meal_type);if(p.foods!==undefined)validateDietFoods(p.foods);if(p.note!==undefined&&(typeof p.note!=="string"||p.note.length>2000))throw new RangeError("note 必须是不超过 2000 个字符的字符串");
    const d={...p,foods:p.foods===undefined?undefined:JSON.stringify(this.enrichDietFoods(p.foods).items)};
    const changed=this.patch("diet_logs",id,d as Record<string,PatchValue>,["date","meal_type","foods","note"]);
    if(changed&&p.foods!==undefined){
      const total=this.enrichDietFoods(p.foods).totalKcal;
      this.db.query("UPDATE diet_logs SET total_kcal=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(total,id);
    }
    return changed;
  }
  archiveDietLog(id:number){return this.archive("diet_logs",id)}

  getOverview(){const today=new Date().toISOString().slice(0,10);return{ingredients:this.getIngredients().slice(0,8),recipes:this.getRecipes().slice(0,4),shoppingItems:this.getShoppingItems(),today:{workouts:this.getWorkouts().filter(x=>x.date===today),habits:this.getHabits().filter(x=>x.date===today)},goals:this.getGoals(),bodyMetrics:this.getBodyMetrics().slice(0,14)}}
}

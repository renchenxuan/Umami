import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RecipeDB } from "../src/db/database";
import { SettingsStore } from "../src/settings";
import { EnvSecretStore, type SecretStore } from "../src/secrets";

class MemorySecretStore implements SecretStore{
  readonly persistence="windows-credential-manager" as const;
  values=new Map<string,string>();
  get(name:string){return this.values.get(name)??""} set(name:string,value:string){this.values.set(name,value)} delete(name:string){this.values.delete(name)}
}
class FailingSecretStore extends MemorySecretStore{override set(){throw new Error("credential unavailable")}}
class FailingReadSecretStore extends MemorySecretStore{override get(){throw new Error("credential read unavailable")}}

const dirs:string[]=[];
afterEach(()=>{for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true})});

describe("RecipeDB migrations",()=>{
  test("upgrades legacy data without changing ids and creates a recovery backup",()=>{
    const dir=mkdtempSync(join(tmpdir(),"health-db-"));dirs.push(dir);const path=join(dir,"legacy.db");
    const legacy=new Database(path);
    legacy.exec(`
      CREATE TABLE ingredients(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,quantity TEXT,category TEXT,source TEXT DEFAULT 'manual',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE recipe_history(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,model_used TEXT,ingredients_snapshot TEXT,week_plan TEXT,nutrition_report TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
      INSERT INTO ingredients(id,name,quantity,category) VALUES(7,'菠菜','1把','蔬菜');
      INSERT INTO recipe_history(id,title,model_used,ingredients_snapshot,week_plan) VALUES(9,'旧计划','mock','[]','旧内容');
      INSERT INTO settings(key,value) VALUES('openai_api_key','must-disappear');
    `);legacy.close();
    const db=new RecipeDB(path);
    expect(db.backupPath).not.toBeNull();expect(existsSync(db.backupPath!)).toBe(true);
    expect(db.getMigrationVersion()).toBe(6);expect(db.getIngredient(7)?.name).toBe("菠菜");
    expect(db.getRecipes().find(r=>r.legacy_history_id===9)?.title).toBe("旧计划");
    expect(db.getSetting("openai_api_key")).toBe("must-disappear");
    const snapshot=new Database(db.backupPath!,{readonly:true});expect((snapshot.query("SELECT name FROM ingredients WHERE id=7").get() as {name:string}).name).toBe("菠菜");expect((snapshot.query("SELECT value FROM settings WHERE key='openai_api_key'").get() as {value:string}).value).toBe("must-disappear");snapshot.close();
    for(const table of ["preferences","ingredients","recipe_history","favorites","settings","workout_logs","body_metrics","health_goals","habit_logs","recipes","shopping_items","conversations","messages","agent_actions","foods","diet_logs"])expect(db.getTableNames()).toContain(table);
    db.close();
    const current=new RecipeDB(path);expect(current.backupPath).toBeNull();current.close();
  });

  test("supports id based CRUD and soft deletion",()=>{
    const db=new RecipeDB(":memory:");const id=db.addIngredient("鸡蛋","2个","蛋奶");
    expect(db.updateIngredient(id,{quantity:"3个"})).toBe(true);expect(db.getIngredient(id)?.quantity).toBe("3个");
    expect(db.archiveIngredient(id)).toBe(true);expect(db.getIngredient(id)).toBeNull();expect(db.archiveIngredient(id)).toBe(false);
    db.close();
  });

  test("keeps newly supplied API keys out of SQLite",()=>{
    const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
    const db=new RecipeDB(":memory:");const settings=new SettingsStore(db,new EnvSecretStore());settings.setKey("openai","runtime-secret");
    expect(settings.getKey("openai")).toBe("runtime-secret");expect(db.getSetting("openai_api_key")).toBeUndefined();
    db.close();if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;
  });

  test("deletes a legacy key only after durable write and read-back",()=>{
    const dir=mkdtempSync(join(tmpdir(),"health-key-"));dirs.push(dir);const path=join(dir,"legacy.db");
    const legacy=new Database(path);legacy.exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO settings VALUES('openai_api_key','legacy-secret')");legacy.close();
    const db=new RecipeDB(path);const secrets=new MemorySecretStore();const settings=new SettingsStore(db,secrets);
    expect(settings.getKey("openai")).toBe("legacy-secret");expect(secrets.get("OPENAI_API_KEY")).toBe("legacy-secret");expect(db.getSetting("openai_api_key")).toBeUndefined();db.close();
    const backup=new Database(db.backupPath!,{readonly:true});expect((backup.query("SELECT value FROM settings WHERE key='openai_api_key'").get())).toBeNull();backup.close();
  });

  test("retains a conflicting legacy key instead of deleting it",()=>{
    const dir=mkdtempSync(join(tmpdir(),"health-key-conflict-"));dirs.push(dir);const path=join(dir,"legacy.db");
    const legacy=new Database(path);legacy.exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO settings VALUES('openai_api_key','legacy-secret')");legacy.close();
    const db=new RecipeDB(path);const secrets=new MemorySecretStore();secrets.set("OPENAI_API_KEY","newer-secret");const settings=new SettingsStore(db,secrets);
    expect(settings.getKey("openai")).toBe("newer-secret");expect(db.getSetting("openai_api_key")).toBe("legacy-secret");db.close();
  });

  test("retains the SQLite recovery copy when credential migration fails or is env-only",()=>{
    for(const secrets of [new FailingSecretStore(),new FailingReadSecretStore(),new EnvSecretStore()] as SecretStore[]){
      const dir=mkdtempSync(join(tmpdir(),"health-key-fail-"));dirs.push(dir);const path=join(dir,"legacy.db");
      const legacy=new Database(path);legacy.exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO settings VALUES('openai_api_key','keep-me')");legacy.close();
      const db=new RecipeDB(path);const settings=new SettingsStore(db,secrets);expect(settings.getKey("openai")).toBe("keep-me");expect(db.getSetting("openai_api_key")).toBe("keep-me");
      const backup=new Database(db.backupPath!,{readonly:true});expect((backup.query("SELECT value FROM settings WHERE key='openai_api_key'").get() as {value:string}).value).toBe("keep-me");backup.close();db.close();
    }
  });

  test("validates health writes in the database boundary",()=>{
    const db=new RecipeDB(":memory:");
    expect(()=>db.updatePreferences({people_count:0})).toThrow();
    expect(()=>db.updatePreferences({days:32})).toThrow();
    expect(()=>db.updatePreferences({allergies:""})).not.toThrow();
    expect(()=>db.addWorkout("not-a-date","跑步",30,"")).toThrow();
    expect(()=>db.addBodyMetric("2026-08-26",5,null,"")).toThrow();
    expect(()=>db.createGoal({name:"目标",status:"invented"})).toThrow();
    expect(()=>db.addHabit("2026-02-30","喝水","1杯")).toThrow();
    expect(()=>db.addDietLog("2026-02-30","早餐",[{name:"鸡蛋"}],"")).toThrow();
    expect(()=>db.addDietLog("2026-08-28","夜宵",[{name:"鸡蛋"}],"")).toThrow();
    expect(()=>db.addDietLog("2026-08-28","早餐",[],"")).toThrow();
    expect(()=>db.addDietLog("2026-08-28","早餐",[{name:""}],"")).toThrow();
    const dietId=db.addDietLog("2026-08-28","早餐",[{name:"鸡蛋",quantity:"2个"}],"");
    expect(db.getDietLog(dietId)?.meal_type).toBe("早餐");
    expect(()=>db.updateDietLog(dietId,{meal_type:"夜宵"})).toThrow();
    expect(db.searchFoods("").length).toBeGreaterThan(100);
    db.close();
  });

  test("captures committed WAL data and never overwrites an earlier migration backup",()=>{
    const dir=mkdtempSync(join(tmpdir(),"health-wal-"));dirs.push(dir);const path=join(dir,"legacy.db");
    const writer=new Database(path);writer.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE ingredients(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,quantity TEXT,category TEXT,source TEXT,created_at TEXT); CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO ingredients(id,name) VALUES(17,'WAL菠菜')");
    const first=new RecipeDB(path);const firstBackup=first.backupPath!;expect(firstBackup).toBeTruthy();const snapshot=new Database(firstBackup,{readonly:true});expect((snapshot.query("SELECT name FROM ingredients WHERE id=17").get() as {name:string}).name).toBe("WAL菠菜");snapshot.close();first.close();writer.close();
    const originalBytes=readFileSync(firstBackup);
    const reset=new Database(path);reset.exec("DELETE FROM schema_migrations");reset.close();
    const second=new RecipeDB(path);expect(second.backupPath).not.toBe(firstBackup);expect(readFileSync(firstBackup).equals(originalBytes)).toBe(true);expect(second.getMigrationBackupPaths()).toContain(firstBackup);expect(second.getMigrationBackupPaths()).toContain(second.backupPath!);second.close();
  });

  test("a later verified Windows-style key write scrubs live and backup SQLite copies",()=>{
    const dir=mkdtempSync(join(tmpdir(),"health-key-scrub-"));dirs.push(dir);const path=join(dir,"legacy.db");
    const legacy=new Database(path);legacy.exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO settings VALUES('openai_api_key','old-secret')");legacy.close();
    const db=new RecipeDB(path);new SettingsStore(db,new EnvSecretStore());expect(db.getSetting("openai_api_key")).toBe("old-secret");
    const settings=new SettingsStore(db,new MemorySecretStore());settings.setKey("openai","replacement-secret");expect(db.getSetting("openai_api_key")).toBeUndefined();
    for(const backupPath of db.getMigrationBackupPaths()){const backup=new Database(backupPath,{readonly:true});expect(backup.query("SELECT value FROM settings WHERE key='openai_api_key'").get()).toBeNull();backup.close()}db.close();
  });
});

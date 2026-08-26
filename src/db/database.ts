import { Database } from "bun:sqlite";

export interface Ingredient {
  id: number;
  name: string;
  quantity: string;
  category: string;
  source: string;
  created_at: string;
}

export interface Favorite {
  id: number;
  recipe_name: string;
  ingredients: unknown;
  steps: unknown;
  created_at: string;
}

export interface RecipeHistory {
  id: number;
  title: string;
  model_used: string;
  week_plan: string;
  created_at: string;
}

export interface Preferences {
  people_count: number;
  taste_preference: string;
  allergies: string;
  cuisine_style: string;
  days: number;
}

export interface Workout {
  id: number;
  date: string;
  activity_type: string;
  duration_min: number;
  detail: string;
  created_at: string;
}

export interface BodyMetric {
  id: number;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  note: string;
  created_at: string;
}

export interface HealthGoal {
  id: number;
  name: string;
  category: string;
  target: string;
  unit: string;
  status: string;
  created_at: string;
}

export interface HabitLog {
  id: number;
  date: string;
  habit: string;
  value: string;
  created_at: string;
}

/**
 * SQLite 数据层。四张表与旧 Python 版 database.py 保持一致：
 * preferences / ingredients / recipe_history / favorites。
 */
export class RecipeDB {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.createTables();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS preferences (
        id INTEGER PRIMARY KEY,
        people_count INTEGER DEFAULT 2,
        taste_preference TEXT DEFAULT '家常',
        allergies TEXT DEFAULT '',
        cuisine_style TEXT DEFAULT '中餐',
        days INTEGER DEFAULT 7
      );

      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity TEXT,
        category TEXT,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recipe_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        model_used TEXT,
        ingredients_snapshot TEXT,
        week_plan TEXT,
        nutrition_report TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_name TEXT NOT NULL,
        ingredients TEXT,
        steps TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        activity_type TEXT,
        duration_min INTEGER,
        detail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS body_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        weight_kg REAL,
        body_fat_pct REAL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS health_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        target TEXT,
        unit TEXT,
        status TEXT DEFAULT '进行中',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        habit TEXT,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO preferences (id, people_count, taste_preference, allergies, cuisine_style, days)
      VALUES (1, 2, '家常', '', '中餐', 7);
    `);
  }

  // ---- 食材 ----

  addIngredient(name: string, quantity: string, category: string, source = "manual"): number {
    const res = this.db
      .query("INSERT INTO ingredients (name, quantity, category, source) VALUES (?, ?, ?, ?)")
      .run(name, quantity, category, source);
    return Number(res.lastInsertRowid);
  }

  getIngredients(): Ingredient[] {
    return this.db
      .query("SELECT * FROM ingredients ORDER BY created_at DESC")
      .all() as Ingredient[];
  }

  deleteIngredient(id: number): void {
    this.db.query("DELETE FROM ingredients WHERE id = ?").run(id);
  }

  clearIngredients(): void {
    this.db.query("DELETE FROM ingredients").run();
  }

  // ---- 菜谱历史 ----

  addRecipeHistory(title: string, modelUsed: string, weekPlanText: string): number {
    const res = this.db
      .query(
        "INSERT INTO recipe_history (title, model_used, week_plan) VALUES (?, ?, ?)",
      )
      .run(title, modelUsed, weekPlanText);
    return Number(res.lastInsertRowid);
  }

  getRecipeHistory(): RecipeHistory[] {
    return this.db
      .query("SELECT * FROM recipe_history ORDER BY created_at DESC")
      .all()
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as number,
          title: r.title as string,
          model_used: r.model_used as string,
          week_plan: (r.week_plan as string) ?? "",
          created_at: r.created_at as string,
        };
      });
  }

  // ---- 收藏夹 ----

  addFavorite(recipeName: string, ingredients: unknown, steps: unknown): number {
    const res = this.db
      .query("INSERT INTO favorites (recipe_name, ingredients, steps) VALUES (?, ?, ?)")
      .run(recipeName, JSON.stringify(ingredients), JSON.stringify(steps));
    return Number(res.lastInsertRowid);
  }

  getFavorites(): Favorite[] {
    return this.db
      .query("SELECT * FROM favorites ORDER BY created_at DESC")
      .all()
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as number,
          recipe_name: r.recipe_name as string,
          ingredients: r.ingredients ? JSON.parse(r.ingredients as string) : null,
          steps: r.steps ? JSON.parse(r.steps as string) : null,
          created_at: r.created_at as string,
        };
      });
  }

  deleteFavorite(id: number): void {
    this.db.query("DELETE FROM favorites WHERE id = ?").run(id);
  }

  // ---- 用户偏好 ----

  getPreferences(): Preferences {
    const row = this.db.query("SELECT * FROM preferences WHERE id = 1").get() as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      return { people_count: 2, taste_preference: "家常", allergies: "", cuisine_style: "中餐", days: 7 };
    }
    return {
      people_count: row.people_count as number,
      taste_preference: row.taste_preference as string,
      allergies: row.allergies as string,
      cuisine_style: row.cuisine_style as string,
      days: row.days as number,
    };
  }

  updatePreferences(patch: Partial<Preferences>): void {
    const allowed = ["people_count", "taste_preference", "allergies", "cuisine_style", "days"] as const;
    const sets: string[] = [];
    const values: (string | number)[] = [];
    for (const key of allowed) {
      const value = patch[key];
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      values.push(value);
    }
    if (sets.length === 0) return;
    values.push(1);
    this.db.query(`UPDATE preferences SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  // ---- 设置（key-value） ----

  getSetting(key: string): string | undefined {
    const row = this.db.query("SELECT value FROM settings WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    this.db
      .query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }

  // ---- 训练记录 ----

  addWorkout(date: string, activityType: string, durationMin: number, detail: string): number {
    const res = this.db
      .query("INSERT INTO workout_logs (date, activity_type, duration_min, detail) VALUES (?, ?, ?, ?)")
      .run(date, activityType, durationMin, detail);
    return Number(res.lastInsertRowid);
  }

  getWorkouts(): Workout[] {
    return this.db.query("SELECT * FROM workout_logs ORDER BY date DESC, id DESC").all() as Workout[];
  }

  // ---- 身体数据 ----

  addBodyMetric(date: string, weightKg: number, bodyFatPct: number | null, note: string): number {
    const res = this.db
      .query("INSERT INTO body_metrics (date, weight_kg, body_fat_pct, note) VALUES (?, ?, ?, ?)")
      .run(date, weightKg, bodyFatPct, note);
    return Number(res.lastInsertRowid);
  }

  getBodyMetrics(): BodyMetric[] {
    return this.db.query("SELECT * FROM body_metrics ORDER BY date DESC, id DESC").all() as BodyMetric[];
  }

  // ---- 健康目标 ----

  addGoal(name: string, category: string, target: string, unit: string): number {
    const res = this.db
      .query("INSERT INTO health_goals (name, category, target, unit) VALUES (?, ?, ?, ?)")
      .run(name, category, target, unit);
    return Number(res.lastInsertRowid);
  }

  getGoals(): HealthGoal[] {
    return this.db.query("SELECT * FROM health_goals ORDER BY id DESC").all() as HealthGoal[];
  }

  updateGoalStatus(name: string, status: string): void {
    this.db.query("UPDATE health_goals SET status = ? WHERE name = ?").run(status, name);
  }

  // ---- 习惯打卡 ----

  addHabit(date: string, habit: string, value: string): number {
    const res = this.db
      .query("INSERT INTO habit_logs (date, habit, value) VALUES (?, ?, ?)")
      .run(date, habit, value);
    return Number(res.lastInsertRowid);
  }

  getHabits(): HabitLog[] {
    return this.db.query("SELECT * FROM habit_logs ORDER BY date DESC, id DESC").all() as HabitLog[];
  }
}

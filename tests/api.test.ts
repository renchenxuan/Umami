import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { handleV1, isPublicIpAddress, validateCustomBaseUrl } from "../src/server/api";
import { probeModel, safeProviderMessage } from "../src/server/server";

let db:RecipeDB|null=null;afterEach(()=>{db?.close();db=null});
const call=async(path:string,init:RequestInit={})=>{db??=new RecipeDB(":memory:");const req=new Request(`http://127.0.0.1:3000${path}`,{headers:{"content-type":"application/json",...(init.headers??{})},...init});const res=await handleV1(req,new URL(req.url),db);return {res:res!,body:await res!.json() as any}};

describe("v1 API",()=>{
  test("returns a consistent envelope and performs CRUD",async()=>{
    const created=await call("/api/v1/ingredients",{method:"POST",body:JSON.stringify({name:"番茄",quantity:"2个",category:"蔬菜"})});
    expect(created.res.status).toBe(201);expect(created.body.ok).toBe(true);const id=created.body.data.id;
    const updated=await call(`/api/v1/ingredients/${id}`,{method:"PATCH",body:JSON.stringify({quantity:"3个"})});expect(updated.body.data.quantity).toBe("3个");
    const removed=await call(`/api/v1/ingredients/${id}`,{method:"DELETE"});expect(removed.body.data.archived).toBe(true);
    const missing=await call(`/api/v1/ingredients/${id}`);expect(missing.res.status).toBe(404);expect(missing.body.error.code).toBe("NOT_FOUND");
  });
  test("validates health ranges",async()=>{const out=await call("/api/v1/body-metrics",{method:"POST",body:JSON.stringify({date:"2026-08-26",weight_kg:5})});expect(out.res.status).toBe(422);expect(out.body.error.code).toBe("VALIDATION_ERROR")});
  test("lists paged persisted messages while POST is reserved for the streaming server",async()=>{const c=await call("/api/v1/conversations",{method:"POST",body:JSON.stringify({title:"测试"})});const id=c.body.data.id;db!.addMessage(id,"user","你好");const list=await call(`/api/v1/conversations/${id}/messages`);expect(list.body.data).toHaveLength(1);expect(list.body.data[0].content).toBe("你好");const direct=await call(`/api/v1/conversations/${id}/messages`,{method:"POST",body:JSON.stringify({content:"绕过流式接口"})});expect(direct.res.status).toBe(405)});
  test("healthz exposes schema status",async()=>{const out=await call("/api/v1/healthz");expect(out.body.data).toEqual({status:"ok",database:"ok",schemaVersion:11})});
  test("searches foods and performs diet-log CRUD",async()=>{
    const allFoods=await call("/api/v1/foods");expect(allFoods.body.data.length).toBeGreaterThan(100);
    const foods=await call("/api/v1/foods?q=番茄");expect(foods.body.data.length).toBeGreaterThan(0);expect(foods.body.data[0].emoji).toBe("🍅");
    const cats=await call("/api/v1/food-categories");expect(cats.body.data).toContain("蔬菜");
    const created=await call("/api/v1/diet-logs",{method:"POST",body:JSON.stringify({date:"2026-08-28",meal_type:"早餐",foods:[{name:"鸡蛋",quantity:"2个"}],note:"好"})});
    expect(created.res.status).toBe(201);const id=created.body.data.id;expect(created.body.data.foods[0]).toMatchObject({name:"鸡蛋",quantity:"2个",grams:100,kcal:144,protein:13.3,source:"table"});
    const list=await call("/api/v1/diet-logs");expect(list.body.data.length).toBeGreaterThan(0);
    const removed=await call(`/api/v1/diet-logs/${id}`,{method:"DELETE"});expect(removed.body.data.archived).toBe(true);
  });
  test("validates diet-log shape and meal types",async()=>{
    for(const body of [
      {date:"2026-02-30",meal_type:"早餐",foods:[{name:"鸡蛋"}]},
      {date:"2026-08-28",meal_type:"夜宵",foods:[{name:"鸡蛋"}]},
      {date:"2026-08-28",meal_type:"早餐",foods:[]},
      {date:"2026-08-28",meal_type:"早餐",foods:[{name:""}]},
    ]){const out=await call("/api/v1/diet-logs",{method:"POST",body:JSON.stringify(body)});expect(out.res.status).toBe(422);expect(out.body.error.code).toBe("VALIDATION_ERROR")}
  });

  test("action transitions are idempotent and enforce confirm cancel undo",async()=>{
    const conversation=(await call("/api/v1/conversations",{method:"POST",body:JSON.stringify({title:"动作"})})).body.data.id;
    const proposal=db!.createAgentAction(conversation,"save_ingredients",{ingredients:[{name:"番茄",quantity:"2个",category:"蔬菜"}]});
    expect(db!.getIngredients()).toHaveLength(0);
    const pending=await call(`/api/v1/actions?conversationId=${conversation}&status=pending`);expect(pending.body.data).toHaveLength(1);
    const confirmed=await call(`/api/v1/actions/${proposal.id}/confirm`,{method:"POST"});expect(confirmed.body.data.status).toBe("confirmed");expect(db!.getIngredients()).toHaveLength(1);
    const repeated=await call(`/api/v1/actions/${proposal.id}/confirm`,{method:"POST"});expect(repeated.body.data.status).toBe("confirmed");expect(db!.getIngredients()).toHaveLength(1);
    const committedEvent=await handleV1(new Request(`http://127.0.0.1:3000/api/v1/actions/${proposal.id}/confirm`,{method:"POST",headers:{accept:"text/event-stream"}}),new URL(`http://127.0.0.1:3000/api/v1/actions/${proposal.id}/confirm`),db!);expect(await committedEvent!.text()).toContain('"type":"action_committed"');
    const undone=await call(`/api/v1/actions/${proposal.id}/undo`,{method:"POST"});expect(undone.body.data.status).toBe("undone");expect(db!.getIngredients()).toHaveLength(0);
    const repeatedUndo=await call(`/api/v1/actions/${proposal.id}/undo`,{method:"POST"});expect(repeatedUndo.body.data.status).toBe("undone");
    const cancelledProposal=db!.createAgentAction(conversation,"log_habit",{date:"2026-08-27",habit:"饮水",value:"2L"});
    const cancelled=await call(`/api/v1/actions/${cancelledProposal.id}/cancel`,{method:"POST"});expect(cancelled.body.data.status).toBe("cancelled");
    const conflict=await call(`/api/v1/actions/${cancelledProposal.id}/confirm`,{method:"POST"});expect(conflict.res.status).toBe(409);expect(db!.getHabits()).toHaveLength(0);
    db!.addFavorite("不可逆收藏",[],[]);const irreversible=db!.createAgentAction(conversation,"delete_favorite",{recipe_name:"不可逆收藏"});await call(`/api/v1/actions/${irreversible.id}/confirm`,{method:"POST"});const unavailable=await call(`/api/v1/actions/${irreversible.id}/undo`,{method:"POST"});expect(unavailable.res.status).toBe(409);expect(unavailable.body.error.message).toContain("不可撤销");
  });
  test("allows allergies to be cleared",async()=>{await call("/api/v1/preferences",{method:"PATCH",body:JSON.stringify({allergies:"花生"})});const cleared=await call("/api/v1/preferences",{method:"PATCH",body:JSON.stringify({allergies:""})});expect(cleared.body.data.allergies).toBe("")});
  test("requires checked to be a boolean on create and update",async()=>{const bad=await call("/api/v1/shopping-items",{method:"POST",body:JSON.stringify({name:"牛奶",checked:"false"})});expect(bad.res.status).toBe(422);const good=await call("/api/v1/shopping-items",{method:"POST",body:JSON.stringify({name:"牛奶",checked:false})});const badPatch=await call(`/api/v1/shopping-items/${good.body.data.id}`,{method:"PATCH",body:JSON.stringify({checked:1})});expect(badPatch.res.status).toBe(422)});
  test("rejects malformed message limits",async()=>{const c=await call("/api/v1/conversations",{method:"POST",body:JSON.stringify({title:"分页"})});for(const limit of ["abc","0","1.5","201"]){const out=await call(`/api/v1/conversations/${c.body.data.id}/messages?limit=${limit}`);expect(out.res.status).toBe(422);expect(out.body.error.fieldErrors.limit).toBeTruthy()}});
  test("rejects malformed message cursors",async()=>{const c=await call("/api/v1/conversations",{method:"POST",body:JSON.stringify({title:"游标"})});for(const before of ["abc","0","-1","1.5"]){const out=await call(`/api/v1/conversations/${c.body.data.id}/messages?before=${before}`);expect(out.res.status).toBe(422);expect(out.body.error.fieldErrors.before).toBeTruthy()}});
});

test("custom endpoints reject unsafe literals and DNS answers",async()=>{
  for(const value of ["0.0.0.0","10.0.0.1","100.64.0.1","127.2.3.4","169.254.2.3","172.31.2.3","192.0.0.1","192.0.2.1","192.168.1.2","198.18.0.1","198.51.100.1","203.0.113.1","224.0.0.1","::","::1","fe80::1","fec0::1","fd00::1","ff02::1","2001:db8::1","::ffff:127.0.0.1"])expect(isPublicIpAddress(value)).toBe(false);
  expect(await validateCustomBaseUrl("http://127.0.0.1:8080/v1")).toBe(false);
  expect(await validateCustomBaseUrl("https://api.example.test/v1",async()=>["192.168.1.4"])).toBe(false);
  expect(await validateCustomBaseUrl("https://api.example.test/v1",async()=>["2606:4700:4700::1111","1.1.1.1"])).toBe(true);
});

test("provider probes use request-scoped keys and redact every error path",async()=>{
  const calls:any[]=[];const secret="unusual-secret-value";
  const collection={completeSimple:async(...args:any[])=>{calls.push(args);return{stopReason:"error",errorMessage:`authorization=${secret} url=https://x.test?v=1&token=${secret}`}}};
  const result=await probeModel(collection as any,{} as any,secret);
  expect(calls[0][2].apiKey).toBe(secret);expect(result.message).not.toContain(secret);expect(safeProviderMessage(new Error(`failed ${secret}`),[secret])).not.toContain(secret);
});

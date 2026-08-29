import type { RecipeDB, ScheduleType } from "../db/database";
import type { AgentActionStatus } from "../db/database";
import { validateScheduleInput } from "../db/database";
import { buildDietSummary } from "./diet-summary";
import type { ApiError, ApiResult } from "../api-types";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type { ApiError, ApiResult } from "../api-types";

const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const success=<T>(data:T,requestId:string,status=200)=>new Response(JSON.stringify({ok:true,data,requestId} satisfies ApiResult<T>),{status,headers:JSON_HEADERS});
const failure=(code:string,message:string,requestId:string,status=400,fieldErrors?:Record<string,string>)=>new Response(JSON.stringify({ok:false,error:{code,message,requestId,...(fieldErrors?{fieldErrors}:{})}} satisfies ApiResult<never>),{status,headers:JSON_HEADERS});
const actionStream=(action:ReturnType<RecipeDB["getAgentAction"]>)=>new Response(
  `data: ${JSON.stringify({type:"action_committed",action})}\n\ndata: ${JSON.stringify({type:"done"})}\n\n`,
  {headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-store"}},
);
const clean=(e:unknown)=>e instanceof Error&&/constraint|foreign key/i.test(e.message)?"请求的数据不符合约束":"请求处理失败";
const integer=(s:string|undefined)=>{const n=Number(s);return Number.isSafeInteger(n)&&n>0?n:null};
const text=(o:Record<string,unknown>,key:string,{required=false,max=500,allowEmpty=false}:{required?:boolean;max?:number;allowEmpty?:boolean}={})=>{const v=o[key];if(v===undefined&&!required)return undefined;if(typeof v!=="string"||(!allowEmpty&&!v.trim())||v.length>max)throw new ValidationError(key,required?`${key} 不能为空且不能超过 ${max} 字符`:`${key} 必须是字符串且不能超过 ${max} 字符`);return v.trim()};
const num=(o:Record<string,unknown>,key:string,min:number,max:number,{required=false,nullable=false}={})=>{const v=o[key];if(v===undefined&&!required)return undefined;if(v===null&&nullable)return null;if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new ValidationError(key,`${key} 必须在 ${min} 到 ${max} 之间`);return v};
const date=(o:Record<string,unknown>,key:string,required=false)=>{const v=text(o,key,{required,max:10});if(v!==undefined){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);const d=m?new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))):null;if(!m||!d||d.toISOString().slice(0,10)!==v)throw new ValidationError(key,`${key} 必须为有效的 YYYY-MM-DD 日期`)}return v};
const mealType=(o:Record<string,unknown>,required=false)=>{const v=text(o,"meal_type",{required,max:20});if(v!==undefined&&!new Set(["早餐","午餐","晚餐","加餐"]).has(v))throw new ValidationError("meal_type","meal_type 必须是早餐、午餐、晚餐或加餐");return v};
const dietFoods=(o:Record<string,unknown>,required=false)=>{const value=o.foods;if(value===undefined&&!required)return undefined;if(!Array.isArray(value)||value.length<1||value.length>100)throw new ValidationError("foods","foods 必须包含 1 到 100 项食物");for(const item of value){if(!item||typeof item!=="object"||Array.isArray(item))throw new ValidationError("foods","foods 中的每一项必须是对象");const food=item as Record<string,unknown>;text(food,"name",{required:true,max:120});text(food,"quantity",{max:80,allowEmpty:true})}return value};
class ValidationError extends Error { constructor(readonly field:string,message:string){super(message)} }
const GOAL_STATUSES=new Set(["进行中","已完成","已暂停","已取消","active","completed","paused","cancelled"]);
const goalStatus=(o:Record<string,unknown>)=>{const value=text(o,"status",{max:20});if(value!==undefined&&!GOAL_STATUSES.has(value))throw new ValidationError("status","status 不是支持的目标状态");return value};

// Large enough for one base64 encoded 5 MiB image plus JSON framing.
export const MAX_JSON_BYTES=8*1024*1024;
export const MAX_IMAGE_BYTES=5*1024*1024;
export const ALLOWED_IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

export async function readJson(req:Request):Promise<Record<string,unknown>>{
  const declared=Number(req.headers.get("content-length")??0);if(declared>MAX_JSON_BYTES)throw new Response("payload too large",{status:413});
  const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>MAX_JSON_BYTES)throw new Response("payload too large",{status:413});
  try{const value=JSON.parse(raw||"{}");if(!value||Array.isArray(value)||typeof value!=="object")throw new Error();return value as Record<string,unknown>}catch{throw new ValidationError("body","请求体必须是 JSON 对象")}
}

const ipv4Parts=(value:string)=>{const parts=value.split(".").map(Number);return parts.length===4&&parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255)?parts:null};
const ipv6Parts=(value:string):number[]|null=>{
  const address=value.toLowerCase();
  const halves=address.split("::");if(halves.length>2)return null;
  const parseHalf=(half:string)=>{if(!half)return[];const out:number[]=[];for(const token of half.split(":")){if(token.includes(".")){const v4=ipv4Parts(token);if(!v4)return null;out.push((v4[0]!<<8)|v4[1]!,(v4[2]!<<8)|v4[3]!)}else{if(!/^[0-9a-f]{1,4}$/.test(token))return null;out.push(parseInt(token,16))}}return out};
  const left=parseHalf(halves[0]!),right=parseHalf(halves[1]??"");if(!left||!right)return null;
  if(halves.length===1)return left.length===8?left:null;
  const zeros=8-left.length-right.length;if(zeros<1)return null;return[...left,...Array(zeros).fill(0),...right];
};

export function isPublicIpAddress(value:string):boolean{
  const address=value.replace(/^\[|\]$/g,"");
  if(isIP(address)===4){
    const p=ipv4Parts(address)!;
    return !(
      p[0]===0||p[0]===10||p[0]===127||p[0]!>=224||
      (p[0]===100&&p[1]!>=64&&p[1]!<=127)||
      (p[0]===169&&p[1]===254)||
      (p[0]===172&&p[1]!>=16&&p[1]!<=31)||
      (p[0]===192&&p[1]===0&&p[2]===0)||
      (p[0]===192&&p[1]===0&&p[2]===2)||
      (p[0]===192&&p[1]===168)||
      (p[0]===198&&p[1]>=18&&p[1]<=19)||
      (p[0]===198&&p[1]===51&&p[2]===100)||
      (p[0]===203&&p[1]===0&&p[2]===113)
    );
  }
  if(isIP(address)===6){
    const p=ipv6Parts(address);if(!p)return false;
    if(p.every(n=>n===0)||p.slice(0,7).every(n=>n===0)&&p[7]===1)return false;
    if((p[0]!&0xfe00)===0xfc00||(p[0]!&0xffc0)===0xfe80||(p[0]!&0xffc0)===0xfec0||(p[0]!&0xff00)===0xff00)return false;
    // IPv4-compatible and IPv4-mapped forms inherit the IPv4 decision.
    const embedded=p.slice(0,6).every(n=>n===0)||(p.slice(0,5).every(n=>n===0)&&p[5]===0xffff);
    if(embedded){const v4=`${p[6]!>>8}.${p[6]!&255}.${p[7]!>>8}.${p[7]!&255}`;return isPublicIpAddress(v4)}
    // Documentation prefix 2001:db8::/32 is not globally routable.
    if(p[0]===0x2001&&p[1]===0x0db8)return false;
    return true;
  }
  return false;
}

export type HostResolver=(hostname:string)=>Promise<string[]>;
const resolveHost:HostResolver=async hostname=>(await lookup(hostname,{all:true,verbatim:true})).map(item=>item.address);

/** Rejects unsafe literals and every resolved private/local address. */
export async function validateCustomBaseUrl(value:string,resolver:HostResolver=resolveHost):Promise<boolean>{
  try{const url=new URL(value);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)return false;const hostname=url.hostname.replace(/^\[|\]$/g,"").toLowerCase();if(!hostname||hostname==="localhost"||hostname.endsWith(".localhost")||hostname.endsWith(".local"))return false;if(isIP(hostname))return isPublicIpAddress(hostname);const addresses=await resolver(hostname);return addresses.length>0&&addresses.every(isPublicIpAddress)}catch{return false}
}

type Resource={list:()=>unknown[];get:(id:number)=>unknown;create:(b:Record<string,unknown>)=>number;update:(id:number,b:Record<string,unknown>)=>boolean;remove:(id:number)=>boolean};

function resources(db:RecipeDB):Record<string,Resource>{return{
  ingredients:{list:()=>db.getIngredients(),get:id=>db.getIngredient(id),create:b=>db.addIngredient(text(b,"name",{required:true,max:120})!,text(b,"quantity",{max:80})??"",text(b,"category",{max:80})??"",text(b,"source",{max:40})??"manual",(b as Record<string,unknown>).zone==="freezer"?"freezer":(b as Record<string,unknown>).zone==="fridge"?"fridge":undefined,undefined,text(b,"note",{max:500})??undefined),update:(id,b)=>db.updateIngredient(id,{name:text(b,"name",{max:120}),quantity:text(b,"quantity",{max:80}),category:text(b,"category",{max:80}),source:text(b,"source",{max:40}),note:text(b,"note",{max:500}),zone:(b as Record<string,unknown>).zone==="freezer"?"freezer":(b as Record<string,unknown>).zone==="fridge"?"fridge":undefined}),remove:id=>db.archiveIngredient(id)},
  workouts:{list:()=>db.getWorkouts(),get:id=>db.getWorkout(id),create:b=>db.addWorkout(date(b,"date",true)!,text(b,"activity_type",{required:true,max:120})!,num(b,"duration_min",1,1440,{required:true})!,text(b,"detail",{max:2000})??""),update:(id,b)=>db.updateWorkout(id,{date:date(b,"date"),activity_type:text(b,"activity_type",{max:120}),duration_min:num(b,"duration_min",1,1440)??undefined,detail:text(b,"detail",{max:2000})}),remove:id=>db.archiveWorkout(id)},
  "body-metrics":{list:()=>db.getBodyMetrics(),get:id=>db.getBodyMetric(id),create:b=>db.addBodyMetric(date(b,"date",true)!,num(b,"weight_kg",20,500,{required:true})!,num(b,"body_fat_pct",1,75,{nullable:true})??null,text(b,"note",{max:1000})??""),update:(id,b)=>db.updateBodyMetric(id,{date:date(b,"date"),weight_kg:num(b,"weight_kg",20,500)??undefined,body_fat_pct:num(b,"body_fat_pct",1,75,{nullable:true}),note:text(b,"note",{max:1000})}),remove:id=>db.archiveBodyMetric(id)},
  habits:{list:()=>db.getHabits(),get:id=>db.getHabit(id),create:b=>db.addHabit(date(b,"date",true)!,text(b,"habit",{required:true,max:120})!,text(b,"value",{required:true,max:200})!),update:(id,b)=>db.updateHabit(id,{date:date(b,"date"),habit:text(b,"habit",{max:120}),value:text(b,"value",{max:200})}),remove:id=>db.archiveHabit(id)},
  goals:{list:()=>db.getGoals(),get:id=>db.getGoal(id),create:b=>db.createGoal({name:text(b,"name",{required:true,max:120})!,category:text(b,"category",{max:80})??"",target:text(b,"target",{max:200})??"",unit:text(b,"unit",{max:40})??"",status:goalStatus(b)??"进行中",target_value:num(b,"target_value",0,1e9,{nullable:true})??null,current_value:num(b,"current_value",0,1e9,{nullable:true})??null,start_date:date(b,"start_date")??null,end_date:date(b,"end_date")??null}),update:(id,b)=>db.updateGoal(id,{name:text(b,"name",{max:120}),category:text(b,"category",{max:80}),target:text(b,"target",{max:200}),unit:text(b,"unit",{max:40}),status:goalStatus(b),target_value:num(b,"target_value",0,1e9,{nullable:true}),current_value:num(b,"current_value",0,1e9,{nullable:true}),start_date:date(b,"start_date"),end_date:date(b,"end_date")}),remove:id=>db.archiveGoal(id)},
  recipes:{list:()=>db.getRecipes(),get:id=>db.getRecipe(id),create:b=>db.createRecipe({title:text(b,"title",{required:true,max:200})!,ingredients:b.ingredients,steps:b.steps,nutrition_estimate:b.nutrition_estimate,source:text(b,"source",{max:40})}),update:(id,b)=>db.updateRecipe(id,{title:text(b,"title",{max:200}),ingredients:b.ingredients,steps:b.steps,nutrition_estimate:b.nutrition_estimate,source:text(b,"source",{max:40})}),remove:id=>db.archiveRecipe(id)},
  "shopping-items":{list:()=>db.getShoppingItems(),get:id=>db.getShoppingItem(id),create:b=>{if(b.checked!==undefined&&typeof b.checked!=="boolean")throw new ValidationError("checked","checked 必须为布尔值");return db.createShoppingItem(text(b,"name",{required:true,max:120})!,text(b,"quantity",{max:80})??"",b.checked??false as boolean)},update:(id,b)=>{if(b.checked!==undefined&&typeof b.checked!=="boolean")throw new ValidationError("checked","checked 必须为布尔值");return db.updateShoppingItem(id,{name:text(b,"name",{max:120}),quantity:text(b,"quantity",{max:80}),checked:b.checked===undefined?undefined:b.checked?1:0})},remove:id=>db.archiveShoppingItem(id)},
  "diet-logs":{list:()=>db.getDietLogs(),get:id=>db.getDietLog(id),create:b=>db.addDietLog(date(b,"date",true)!,mealType(b,true)!,dietFoods(b,true)!,text(b,"note",{max:2000,allowEmpty:true})??""),update:(id,b)=>db.updateDietLog(id,{date:date(b,"date"),meal_type:mealType(b),foods:dietFoods(b),note:text(b,"note",{max:2000,allowEmpty:true})}),remove:id=>db.archiveDietLog(id)},
  favorites:{list:()=>db.getFavorites(),get:id=>db.getFavorite(id),create:()=>{throw new ValidationError("favorites","收藏仅可由对话中的收藏动作创建")},update:()=>false,remove:(id)=>{db.deleteFavorite(id);return true}},
}}

export async function handleV1(req:Request,url:URL,db:RecipeDB):Promise<Response|null>{
  if(!url.pathname.startsWith("/api/v1/"))return null;const requestId=crypto.randomUUID();
  try{
    if(req.method==="GET"&&url.pathname==="/api/v1/healthz")return success({status:"ok",database:"ok",schemaVersion:db.getMigrationVersion()},requestId);
    if(req.method==="GET"&&url.pathname==="/api/v1/overview")return success(db.getOverview(),requestId);
    if(req.method==="GET"&&url.pathname==="/api/v1/foods"){const q=url.searchParams.get("q")??"";const category=url.searchParams.get("category")??undefined;return success(db.searchFoods(q,category),requestId)}
    if(req.method==="GET"&&url.pathname==="/api/v1/food-categories")return success(db.getFoodCategories(),requestId);
    if(req.method==="GET"&&url.pathname==="/api/v1/recipe-history")return success(db.getRecipeHistory(),requestId);
    if(req.method==="GET"&&url.pathname==="/api/v1/diet-summary")return success(buildDietSummary(db),requestId);
    if(req.method==="GET"&&url.pathname==="/api/v1/export"){const bundle=db.getExportBundle();return new Response(JSON.stringify({ok:true,data:bundle,requestId}),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="health-data-${new Date().toISOString().slice(0,10)}.json"`}})}
    if(url.pathname==="/api/v1/fridge-settings"){
      if(req.method==="GET")return success(db.getFridgeSettings(),requestId);
      if(req.method==="PUT"){const b=await readJson(req);const cur=db.getFridgeSettings();const clamp=(v:unknown,min:number,max:number,fallback:number)=>typeof v==="number"&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;const freezerTemp=clamp(b.freezerTemp,-40,10,cur.freezerTemp);const fridgeTemp=clamp(b.fridgeTemp,-10,15,cur.fridgeTemp);db.setFridgeSettings({freezerTemp,fridgeTemp});return success(db.getFridgeSettings(),requestId)}
    }
    if(url.pathname==="/api/v1/preferences"){
      if(req.method==="GET")return success(db.getPreferences(),requestId);
      if(req.method==="PATCH"){const b=await readJson(req);const patch={people_count:num(b,"people_count",1,20)??undefined,taste_preference:text(b,"taste_preference",{max:200}),allergies:text(b,"allergies",{max:1000,allowEmpty:true}),cuisine_style:text(b,"cuisine_style",{max:120}),days:num(b,"days",1,31)??undefined,height_cm:num(b,"height_cm",80,250,{nullable:true}),age:num(b,"age",1,120,{nullable:true}),gender:text(b,"gender",{max:20,allowEmpty:true}),activity_level:text(b,"activity_level",{max:40,allowEmpty:true}),calorie_target:num(b,"calorie_target",800,6000,{nullable:true})??undefined};db.updatePreferences(patch);return success(db.getPreferences(),requestId)}
    }
    if(url.pathname==="/api/v1/conversations"){
      if(req.method==="GET")return success(db.getConversations(),requestId);
      if(req.method==="POST"){const b=await readJson(req);const id=db.createConversation(text(b,"title",{max:120})??"新对话",b.context??{});return success(db.getConversation(id),requestId,201)}
    }
    if(url.pathname==="/api/v1/actions"&&req.method==="GET"){
      const conversationRaw=url.searchParams.get("conversationId"),statusRaw=url.searchParams.get("status");
      let conversationId:number|undefined;
      if(conversationRaw!==null){const parsed=integer(conversationRaw);if(!parsed)throw new ValidationError("conversationId","conversationId 必须是正整数");conversationId=parsed}
      const statuses=new Set<AgentActionStatus>(["pending","confirmed","cancelled","undone"]);
      if(statusRaw!==null&&!statuses.has(statusRaw as AgentActionStatus))throw new ValidationError("status","status 不是支持的操作状态");
      const status=statusRaw===null?undefined:statusRaw as AgentActionStatus;
      return success(db.getAgentActions({conversationId,status}),requestId);
    }
    const actionMatch=url.pathname.match(/^\/api\/v1\/actions\/(\d+)(?:\/(confirm|cancel|undo))?$/);
    if(actionMatch){const id=integer(actionMatch[1]);if(!id)return failure("INVALID_ID","ID 无效",requestId);const transition=actionMatch[2];
      if(!transition&&req.method==="GET"){const action=db.getAgentAction(id);return action?success(action,requestId):failure("NOT_FOUND","待确认操作不存在",requestId,404)}
      if(transition&&req.method==="POST"){
        const action=transition==="confirm"?db.confirmAgentAction(id):transition==="cancel"?db.cancelAgentAction(id):db.undoAgentAction(id);
        if(!action)return failure("NOT_FOUND","待确认操作不存在",requestId,404);
        if(transition==="confirm"&&req.headers.get("accept")?.includes("text/event-stream"))return actionStream(action);
        return success(action,requestId);
      }
    }
    const cm=url.pathname.match(/^\/api\/v1\/conversations\/(\d+)(?:\/(messages))?$/);
    if(cm){const id=integer(cm[1]);if(!id)return failure("INVALID_ID","ID 无效",requestId);const conv=db.getConversation(id);if(!conv)return failure("NOT_FOUND","对话不存在",requestId,404);
      if(!cm[2]&&req.method==="GET")return success(conv,requestId);
      if(!cm[2]&&req.method==="DELETE"){db.archiveConversation(id);return success({id,archived:true},requestId)}
      if(!cm[2]&&req.method==="PATCH"){const b=await readJson(req);const title=text(b,"title",{required:true,max:120});if(title===undefined)throw new ValidationError("title","title 不能为空且不能超过 120 字符");db.renameConversation(id,title);return success(db.getConversation(id),requestId)}
      if(cm[2]&&req.method==="GET"){
        const rawLimit=url.searchParams.get("limit"),limit=rawLimit===null?100:Number(rawLimit);
        if(!Number.isSafeInteger(limit)||limit<1||limit>200)throw new ValidationError("limit","limit 必须是 1 到 200 的整数");
        const rawBefore=url.searchParams.get("before");
        let before:number|undefined;
        if(rawBefore!==null){const parsed=integer(rawBefore);if(!parsed)throw new ValidationError("before","before 必须是正整数");before=parsed}
        return success(db.getMessages(id,limit,before),requestId);
      }
      if(cm[2]&&req.method==="POST")return failure("METHOD_NOT_ALLOWED","请通过会话流式消息接口发送用户消息",requestId,405);
    }
    // 定时任务/自动化：独立于通用资源表（需要 next_fire_at 重算与硬删除语义）
    // 请求体格式错误 → 422（ValidationError）；时间已过等状态冲突由存储层抛 RangeError → 409
    const validateSchedule=(record:Record<string,unknown>)=>{try{validateScheduleInput(record)}catch(e){if(e instanceof RangeError)throw new ValidationError("schedule",e.message);throw e}};
    const scheduleMatch=url.pathname.match(/^\/api\/v1\/schedules(?:\/(\d+))?$/);
    if(scheduleMatch){
      const id=scheduleMatch[1]?integer(scheduleMatch[1]):null;
      if(scheduleMatch[1]&&!id)return failure("INVALID_ID","ID 无效",requestId);
      if(req.method==="GET"&&!id)return success(db.getSchedules(),requestId);
      if(req.method==="POST"&&!id){
        const b=await readJson(req);
        const weekdaysRaw=b.weekdays;
        const record={title:text(b,"title",{required:true,max:120})!,message:text(b,"message",{required:true,max:2000})!,schedule_type:text(b,"schedule_type",{required:true,max:10})!,time_of_day:text(b,"time_of_day",{required:true,max:5})!,weekdays:Array.isArray(weekdaysRaw)?weekdaysRaw.map(v=>Number(v)):null,fire_date:date(b,"fire_date")??null};
        validateSchedule(record);
        const conversationId=num(b,"conversation_id",1,1e9)??db.getConversations()[0]?.id??db.createConversation("定时提醒");
        const newId=db.createSchedule({conversationId,title:record.title,message:record.message,scheduleType:record.schedule_type as ScheduleType,timeOfDay:record.time_of_day,weekdays:record.weekdays,fireDate:record.fire_date});
        return success(db.getSchedule(newId),requestId,201);
      }
      if(id&&req.method==="GET"){const schedule=db.getSchedule(id);return schedule?success(schedule,requestId):failure("NOT_FOUND","定时任务不存在",requestId,404)}
      if(id&&req.method==="PATCH"){
        const current=db.getSchedule(id);if(!current)return failure("NOT_FOUND","定时任务不存在",requestId,404);
        const b=await readJson(req);
        if(b.enabled!==undefined&&b.enabled!==0&&b.enabled!==1)throw new ValidationError("enabled","enabled 必须是 0 或 1");
        const weekdaysRaw=b.weekdays;
        const merged={title:text(b,"title",{max:120})??current.title,message:text(b,"message",{max:2000})??current.message,schedule_type:text(b,"schedule_type",{max:10})??current.schedule_type,time_of_day:text(b,"time_of_day",{max:5})??current.time_of_day,weekdays:weekdaysRaw!==undefined?(Array.isArray(weekdaysRaw)?weekdaysRaw.map(v=>Number(v)):null):current.weekdays,fire_date:b.fire_date===undefined?current.fire_date:date(b,"fire_date")};
        validateSchedule(merged);
        const patch:{title?:string;message?:string;schedule_type?:ScheduleType;time_of_day?:string;weekdays?:number[]|null;fire_date?:string|null;enabled?:number}={
          title:b.title!==undefined?merged.title:undefined,
          message:b.message!==undefined?merged.message:undefined,
          schedule_type:b.schedule_type!==undefined?merged.schedule_type as ScheduleType:undefined,
          time_of_day:b.time_of_day!==undefined?merged.time_of_day:undefined,
          weekdays:weekdaysRaw!==undefined?merged.weekdays:undefined,
          fire_date:b.fire_date!==undefined?merged.fire_date:undefined,
          enabled:b.enabled,
        };
        try{db.updateSchedule(id,patch)}catch(e){if(e instanceof RangeError)return failure("ACTION_CONFLICT",e.message,requestId,409);throw e}
        return success(db.getSchedule(id),requestId);
      }
      if(id&&req.method==="DELETE"){if(!db.deleteSchedule(id))return failure("NOT_FOUND","定时任务不存在",requestId,404);return success({id,deleted:true},requestId)}
    }
    const match=url.pathname.match(/^\/api\/v1\/([^/]+)(?:\/(\d+))?$/);if(match){const resource=resources(db)[match[1]!];if(resource){const id=match[2]?integer(match[2]):null;if(match[2]&&!id)return failure("INVALID_ID","ID 无效",requestId);
      if(req.method==="GET"){const value=id?resource.get(id):resource.list();if(id&&!value)return failure("NOT_FOUND","记录不存在",requestId,404);return success(value,requestId)}
      if(req.method==="POST"&&!id){const newId=resource.create(await readJson(req));return success(resource.get(newId),requestId,201)}
      if(req.method==="PATCH"&&id){if(!resource.update(id,await readJson(req)))return failure("NOT_FOUND","记录不存在",requestId,404);return success(resource.get(id),requestId)}
      if(req.method==="DELETE"&&id){if(!resource.remove(id))return failure("NOT_FOUND","记录不存在",requestId,404);return success({id,archived:true},requestId)}
    }}
    return failure("NOT_FOUND","接口不存在",requestId,404);
  }catch(e){if(e instanceof Response)return failure("PAYLOAD_TOO_LARGE","请求体过大",requestId,413);if(e instanceof ValidationError)return failure("VALIDATION_ERROR","输入校验失败",requestId,422,{[e.field]:e.message});if(e instanceof RangeError)return failure("ACTION_CONFLICT",e.message,requestId,409);console.error(`[${requestId}]`,e);return failure("INTERNAL_ERROR",clean(e),requestId,500)}
}

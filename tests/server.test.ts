import { afterEach, describe, expect, test } from "bun:test";
import { RecipeDB } from "../src/db/database";
import { buildModels } from "../src/models";
import { EnvSecretStore } from "../src/secrets";
import { startServer } from "../src/server/server";
import { SettingsStore } from "../src/settings";

const originalUnsafe=process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;
afterEach(()=>{if(originalUnsafe===undefined)delete process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;else process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS=originalUnsafe});

const start=()=>{
  delete process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;
  const db=new RecipeDB(":memory:");const settings=new SettingsStore(db,new EnvSecretStore());
  const calls:unknown[][]=[];
  const models={getModel:()=>({provider:"openai",id:"test"}),setProvider:()=>{},completeSimple:async(...args:unknown[])=>{calls.push(args);return{stopReason:"stop"}}};
  const agent={state:{model:{},errorMessage:undefined},subscribe:()=>{},prompt:async()=>{}};
  const server=startServer(agent as any,db,settings,models as any,{port:0});
  return{db,settings,models,calls,server};
};

describe("loopback server boundary",()=>{
  test("accepts only fixed loopback Host and Origin values on the configured port",async()=>{
    const ctx=start();const port=ctx.server.port;const base=`http://127.0.0.1:${port}/api/v1/healthz`;
    try{
      for(const host of [`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`]){
        const response=await fetch(base,{headers:{host,origin:`http://${host}`}});expect(response.status).toBe(200);
      }
      for(const host of [`health.example:${port}`,`localhost:${port+1}`,`127.0.0.1.evil:${port}`]){
        const response=await fetch(base,{headers:{host}});expect(response.status).toBe(403);expect((await response.json() as any).error.code).toBe("HOST_REJECTED");
      }
      const badOrigin=await fetch(base,{headers:{host:`127.0.0.1:${port}`,origin:`http://health.example:${port}`}});expect(badOrigin.status).toBe(403);expect((await badOrigin.json() as any).error.code).toBe("ORIGIN_REJECTED");
    }finally{ctx.server.stop(true);ctx.db.close()}
  });

  test("disables custom endpoint save and probing by default without affecting built-in probes",async()=>{
    const ctx=start();const port=ctx.server.port;const endpoint=`http://127.0.0.1:${port}`;const headers={"content-type":"application/json",host:`127.0.0.1:${port}`};
    try{
      const overview=await fetch(`${endpoint}/api/v1/settings/model`,{headers});const overviewBody=await overview.json() as any;expect(overviewBody.data.custom).toMatchObject({enabled:false,safety:"disabled_by_default",optInEnvironmentVariable:"ALLOW_UNSAFE_CUSTOM_ENDPOINTS"});
      for(const [path,body,method] of [["/api/v1/settings/model",{modelName:"custom",apiKey:"secret",baseUrl:"https://1.1.1.1/v1",modelId:"x"},"PUT"],["/api/v1/settings/model/capabilities",{provider:"custom",key:"secret",baseUrl:"https://1.1.1.1/v1",modelId:"x"},"POST"]] as const){const response=await fetch(endpoint+path,{method,headers,body:JSON.stringify(body)});expect(response.status).toBe(403)}
      expect(ctx.settings.get("custom_base_url")).toBe("");expect(ctx.calls).toHaveLength(0);
      const builtIn=await fetch(`${endpoint}/api/v1/settings/model/capabilities`,{method:"POST",headers,body:JSON.stringify({provider:"openai",key:"request-only"})});expect(builtIn.status).toBe(200);expect(ctx.calls).toHaveLength(1);expect((ctx.calls[0]![2] as any).apiKey).toBe("request-only");
    }finally{ctx.server.stop(true);ctx.db.close()}
  });

  test("does not register custom models unless unsafe opt-in is explicit",()=>{
    const db=new RecipeDB(":memory:");const settings=new SettingsStore(db,new EnvSecretStore());settings.set("custom_base_url","https://1.1.1.1/v1");settings.set("custom_model","custom-test");
    delete process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS;expect(buildModels(settings,"https://1.1.1.1/v1").getModel("custom","custom-test")).toBeUndefined();
    process.env.ALLOW_UNSAFE_CUSTOM_ENDPOINTS="true";expect(buildModels(settings,"https://1.1.1.1/v1").getModel("custom","custom-test")).toBeTruthy();db.close();
  });
});

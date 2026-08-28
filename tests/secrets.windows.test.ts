import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { WindowsCredentialSecretStore } from "../src/secrets";

const windowsTest=process.platform==="win32"?test:test.skip;

windowsTest("Windows Credential Manager supports create, replace, read and delete",()=>{
  const store=new WindowsCredentialSecretStore();
  const target=`CODEX_TEST_${randomUUID()}`;
  try{
    store.set(target,"first-value");expect(store.get(target)).toBe("first-value");
    store.set(target,"replacement-value");expect(store.get(target)).toBe("replacement-value");
    store.delete(target);expect(store.get(target)).toBe("");
  }finally{
    store.delete(target);
  }
},30_000);

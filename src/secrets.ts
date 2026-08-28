import { spawnSync } from "node:child_process";

export interface SecretStore {
  get(name: string): string;
  set(name: string, value: string): void;
  delete(name: string): void;
  readonly persistence: "windows-credential-manager" | "environment-only";
}

const CREDENTIAL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$inputValue = [Console]::In.ReadToEnd() | ConvertFrom-Json
if (-not ('SmartRecipeCredential.Native' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace SmartRecipeCredential {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags; public UInt32 Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist;
    public UInt32 AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  public static class Native {
    [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredWrite(ref CREDENTIAL credential, UInt32 flags);
    [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credential);
    [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
    [DllImport("advapi32.dll", SetLastError=true)] public static extern void CredFree(IntPtr buffer);
  }
}
'@
}
$target = 'SmartRecipeManager:' + [string]$inputValue.name
switch ([string]$inputValue.operation) {
  'get' {
    $pointer = [IntPtr]::Zero
    if (-not [SmartRecipeCredential.Native]::CredRead($target, 1, 0, [ref]$pointer)) {
      if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 1168) { return }
      throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
    }
    try {
      $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($pointer, [type][SmartRecipeCredential.CREDENTIAL])
      if ($credential.CredentialBlobSize -gt 0) {
        [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [int]($credential.CredentialBlobSize / 2))
      }
    } finally { [SmartRecipeCredential.Native]::CredFree($pointer) }
  }
  'set' {
    $bytes = [Text.Encoding]::Unicode.GetBytes([string]$inputValue.value)
    $blob = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    try {
      [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
      $credential = [SmartRecipeCredential.CREDENTIAL]::new()
      $credential.Type = 1; $credential.TargetName = $target; $credential.UserName = 'SmartRecipeManager'
      $credential.CredentialBlobSize = $bytes.Length; $credential.CredentialBlob = $blob; $credential.Persist = 2
      if (-not [SmartRecipeCredential.Native]::CredWrite([ref]$credential, 0)) {
        throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
      }
    } finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($blob) }
  }
  'delete' {
    if (-not [SmartRecipeCredential.Native]::CredDelete($target, 1, 0)) {
      $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
      if ($code -ne 1168) { throw [ComponentModel.Win32Exception]::new($code) }
    }
  }
  default { throw 'Unsupported credential operation' }
}`;

/** Windows Generic Credentials, scoped to the current Windows user. */
export class WindowsCredentialSecretStore implements SecretStore {
  readonly persistence = "windows-credential-manager" as const;

  private run(operation: "get" | "set" | "delete", name: string, value?: string): string {
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", CREDENTIAL_SCRIPT],
      { input: JSON.stringify({ operation, name, value }), encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error((result.stderr || "Windows Credential Manager operation failed").trim());
    return result.stdout.replace(/[\r\n]+$/, "");
  }

  get(name: string): string { return this.run("get", name); }
  set(name: string, value: string): void { this.run("set", name, value); }
  delete(name: string): void { this.run("delete", name); }
}

export function createSecretStore(): SecretStore {
  return process.platform === "win32" ? new WindowsCredentialSecretStore() : new EnvSecretStore();
}

export class EnvSecretStore implements SecretStore {
  readonly persistence = "environment-only" as const;
  get(name: string): string { return process.env[name] ?? ""; }
  set(name: string, value: string): void { process.env[name] = value; }
  delete(name: string): void { delete process.env[name]; }
}

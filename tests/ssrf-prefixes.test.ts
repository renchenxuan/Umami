import { describe, expect, test } from "bun:test";
import { isPublicIpAddress } from "../src/server/api";

describe("isPublicIpAddress", () => {
  test("公网地址放行", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700::1111"]) {
      expect(isPublicIpAddress(ip)).toBe(true);
    }
  });

  test("内网与保留 IPv4 一律拒绝", () => {
    for (const ip of ["0.0.0.0", "10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "224.0.0.1", "100.64.0.1", "198.18.0.1", "203.0.113.9"]) {
      expect(isPublicIpAddress(ip)).toBe(false);
    }
  });

  // 6to4 把 IPv4 内嵌在 2002::/16 的第 2-3 段，漏判即可绕过白名单打到元数据服务
  test("6to4 内嵌内网 IPv4 时拒绝，内嵌公网 IPv4 时放行", () => {
    expect(isPublicIpAddress("2002:a9fe:a9fe::")).toBe(false); // 169.254.169.254
    expect(isPublicIpAddress("2002:0a00:0001::")).toBe(false); // 10.0.0.1
    expect(isPublicIpAddress("2002:7f00:0001::")).toBe(false); // 127.0.0.1
    expect(isPublicIpAddress("2002:0808:0808::")).toBe(true); // 8.8.8.8
  });

  test("NAT64 内嵌内网 IPv4 时拒绝", () => {
    expect(isPublicIpAddress("64:ff9b::7f00:1")).toBe(false); // 127.0.0.1
    expect(isPublicIpAddress("64:ff9b::a9fe:a9fe")).toBe(false); // 169.254.169.254
    expect(isPublicIpAddress("64:ff9b::808:808")).toBe(true); // 8.8.8.8
  });

  test("Teredo / ORCHID / discard-only / 唯一本地 / 链路本地 / 多播均拒绝", () => {
    for (const ip of ["2001:0:1234::1", "2001:10::1", "100::1", "fc00::1", "fe80::1", "ff02::1", "::1", "::"]) {
      expect(isPublicIpAddress(ip)).toBe(false);
    }
    expect(isPublicIpAddress("2001:db8::1")).toBe(false);
  });

  test("IPv4-mapped / IPv4-compatible 沿用 IPv4 判定", () => {
    expect(isPublicIpAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicIpAddress("::ffff:192.168.1.1")).toBe(false);
    expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
  });

  test("192.88.99.0/24（6to4 中继任播）拒绝", () => {
    expect(isPublicIpAddress("192.88.99.1")).toBe(false);
    expect(isPublicIpAddress("192.88.98.1")).toBe(true);
  });
});

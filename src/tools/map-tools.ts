import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { SettingsStore } from "../settings";
import { EXTERNAL_SERVICES } from "../settings";
import { safeProviderMessage } from "../server/errors";
import { text } from "./helpers";

/**
 * 地图服务工具（只读）：地点搜索 + 步行/骑行路线测算。
 * 支持百度 / 高德 / 谷歌三家，密钥在设置中心「外部服务」页配置（存系统凭据）。
 * 激活服务 = 用户设置的默认 → 第一个已连接的；全部未连接时返回连接引导。
 * 说明：pi-agent 框架不含 MCP 客户端，这里以各官方 REST API 直接对接（能力等同）。
 */

const REQUEST_TIMEOUT_MS = 10_000;

interface BaiduEnvelope {
  status?: number;
  message?: string;
  result?: unknown;
}

export type MapFetcher = (url: string, init?: { signal: AbortSignal }) => Promise<Response>;

interface GeoPoint {
  lat: number;
  lng: number;
}

interface PlaceResult {
  name: string;
  address: string;
  distanceKm?: number;
}

interface RouteResult {
  distanceM: number;
  durationS: number;
}

interface MapProvider {
  id: string;
  label: string;
  geocode(address: string): Promise<GeoPoint>;
  searchPlaces(keyword: string, center: GeoPoint, radiusM: number): Promise<PlaceResult[]>;
  route(origin: GeoPoint, destination: GeoPoint, mode: "walking" | "riding"): Promise<RouteResult>;
}

const pointString = (p: GeoPoint) => `${p.lat},${p.lng}`;

/** 球面直线距离（km），用于不返回距离的服务（谷歌 nearbysearch）。 */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchJson(fetcher: MapFetcher, url: URL, secrets: string[]): Promise<unknown> {
  let res: Response;
  try {
    res = await fetcher(url.toString(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (e) {
    throw new Error(`无法连接地图服务：${safeProviderMessage(e, secrets)}`);
  }
  if (!res.ok) throw new Error(`地图服务返回 HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`地图服务返回了无法解析的内容：${safeProviderMessage(new Error(text.slice(0, 120)), secrets)}`);
  }
}

// ===================== 百度 =====================
function baiduProvider(ak: string, fetchRef: MapFetcher): MapProvider {
  const secrets = [ak];
  const call = async (path: string, params: Record<string, string>) => {
    const url = new URL(`https://api.map.baidu.com${path}`);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    url.searchParams.set("ak", ak);
    const data = (await fetchJson(fetchRef, url, secrets)) as BaiduEnvelope;
    if (data.status !== 0) throw new Error(`百度地图错误（status=${data.status}）：${data.message ?? "未知错误"}`);
    return data.result;
  };
  return {
    id: "baidu_map",
    label: "百度地图",
    async geocode(address) {
      const r = (await call("/geocoding/v3/", { address, output: "json" })) as { location?: { lat?: number; lng?: number } };
      if (typeof r?.location?.lat !== "number" || typeof r?.location?.lng !== "number") {
        throw new Error(`无法解析地名「${address}」的坐标，请换一个更具体的地址`);
      }
      return { lat: r.location.lat, lng: r.location.lng };
    },
    async searchPlaces(keyword, center, radiusM) {
      const r = (await call("/place/v2/search", { query: keyword, location: pointString(center), radius: String(radiusM), scope: "2", output: "json" })) as Array<{ name?: string; address?: string; distance?: number }>;
      return (Array.isArray(r) ? r : []).slice(0, 6).map((p) => ({
        name: p.name ?? "未命名",
        address: typeof p.address === "string" ? p.address : "",
        distanceKm: typeof p.distance === "number" ? p.distance / 1000 : undefined,
      }));
    },
    async route(origin, destination, mode) {
      const r = (await call(`/routematrix/v2/${mode}`, { origins: pointString(origin), destinations: pointString(destination), output: "json" })) as Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
      const row = Array.isArray(r) ? r[0] : undefined;
      if (typeof row?.distance?.value !== "number" || typeof row?.duration?.value !== "number") {
        throw new Error("百度地图没能给出两点间的路线，可能距离过远或无路网连接");
      }
      return { distanceM: row.distance.value, durationS: row.duration.value };
    },
  };
}

// ===================== 高德 =====================
function amapProvider(key: string, fetchRef: MapFetcher): MapProvider {
  const secrets = [key];
  const call = async (path: string, params: Record<string, string>) => {
    const url = new URL(`https://restapi.amap.com${path}`);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    url.searchParams.set("key", key);
    return fetchJson(fetchRef, url, secrets);
  };
  // 高德坐标是「lng,lat」顺序
  const parseLngLat = (s: string): GeoPoint => {
    const [lng, lat] = s.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("高德地图返回了无法解析的坐标");
    return { lat, lng };
  };
  return {
    id: "amap_map",
    label: "高德地图",
    async geocode(address) {
      const r = (await call("/v3/geocode/geo", { address })) as { status?: string; geocodes?: Array<{ location?: string }> };
      if (r.status !== "1" || !r.geocodes?.[0]?.location) throw new Error(`无法解析地名「${address}」的坐标，请换一个更具体的地址`);
      return parseLngLat(r.geocodes[0].location);
    },
    async searchPlaces(keyword, center, radiusM) {
      const r = (await call("/v3/place/around", { location: `${center.lng},${center.lat}`, keywords: keyword, radius: String(Math.round(radiusM)), offset: "6" })) as { status?: string; pois?: Array<{ name?: string; address?: string; distance?: string }> };
      if (r.status !== "1") throw new Error("高德地图地点搜索失败");
      return (r.pois ?? []).slice(0, 6).map((p) => ({
        name: p.name ?? "未命名",
        address: p.address ?? "",
        distanceKm: p.distance && Number.isFinite(Number(p.distance)) ? Number(p.distance) / 1000 : undefined,
      }));
    },
    async route(origin, destination, mode) {
      if (mode === "walking") {
        const r = (await call("/v3/direction/walking", { origin: `${origin.lng},${origin.lat}`, destination: `${destination.lng},${destination.lat}` })) as { status?: string; route?: { paths?: Array<{ distance?: string; duration?: string }> } };
        const path = r.route?.paths?.[0];
        if (r.status !== "1" || !path?.distance || !path?.duration) throw new Error("高德地图没能给出步行路线");
        return { distanceM: Number(path.distance), durationS: Number(path.duration) };
      }
      const r = (await call("/v4/direction/bicycling", { origin: `${origin.lng},${origin.lat}`, destination: `${destination.lng},${destination.lat}` })) as { errcode?: number; data?: { paths?: Array<{ distance?: number; duration?: number }> } };
      const path = r.data?.paths?.[0];
      if (r.errcode !== 0 || !path?.distance || !path?.duration) throw new Error("高德地图没能给出骑行路线");
      return { distanceM: path.distance, durationS: path.duration };
    },
  };
}

// ===================== 谷歌 =====================
function googleProvider(key: string, fetchRef: MapFetcher): MapProvider {
  const secrets = [key];
  const call = async (path: string, params: Record<string, string>) => {
    const url = new URL(`https://maps.googleapis.com${path}`);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    url.searchParams.set("key", key);
    return fetchJson(fetchRef, url, secrets);
  };
  return {
    id: "google_maps",
    label: "谷歌地图",
    async geocode(address) {
      const r = (await call("/maps/api/geocode/json", { address })) as { status?: string; results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> };
      const loc = r.results?.[0]?.geometry?.location;
      if (r.status !== "OK" || !loc) throw new Error(`无法解析地名「${address}」的坐标，请换一个更具体的地址`);
      return loc;
    },
    async searchPlaces(keyword, center, radiusM) {
      const r = (await call("/maps/api/place/nearbysearch/json", { location: pointString(center), radius: String(Math.round(radiusM)), keyword })) as { status?: string; results?: Array<{ name?: string; vicinity?: string; geometry?: { location?: GeoPoint } }> };
      if (r.status !== "OK") throw new Error("谷歌地图地点搜索失败");
      return (r.results ?? []).slice(0, 6).map((p) => ({
        name: p.name ?? "未命名",
        address: p.vicinity ?? "",
        distanceKm: p.geometry?.location ? haversineKm(center, p.geometry.location) : undefined,
      }));
    },
    async route(origin, destination, mode) {
      const r = (await call("/maps/api/distancematrix/json", { origins: pointString(origin), destinations: pointString(destination), mode: mode === "riding" ? "bicycling" : "walking" })) as { status?: string; rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number }; duration?: { value?: number } }> }> };
      const el = r.rows?.[0]?.elements?.[0];
      if (r.status !== "OK" || el?.status !== "OK" || typeof el.distance?.value !== "number" || typeof el.duration?.value !== "number") {
        throw new Error("谷歌地图没能给出两点间的路线");
      }
      return { distanceM: el.distance.value, durationS: el.duration.value };
    },
  };
}

const SearchSchema = Type.Object({
  keyword: Type.String({ description: "搜索关键词，如 公园" }),
  location: Type.String({ description: "中心点地名或地址，如 北京市朝阳区望京 / 小区名" }),
  radius_km: Type.Optional(Type.Number({ minimum: 0.5, maximum: 50, description: "搜索半径（公里），默认 3" })),
});

const RouteSchema = Type.Object({
  origin: Type.String({ description: "起点地名或地址" }),
  destination: Type.String({ description: "终点地名或地址" }),
  mode: Type.Union([Type.Literal("walking"), Type.Literal("riding")], { description: "出行方式：walking 步行 / riding 骑行" }),
});

/** 按服务 id 构造 provider 实例。 */
function buildProvider(id: string, settings: SettingsStore, fetchRef: MapFetcher): MapProvider {
  const key = settings.getExternalServiceKey(id);
  if (id === "baidu_map") return baiduProvider(key, fetchRef);
  if (id === "amap_map") return amapProvider(key, fetchRef);
  return googleProvider(key, fetchRef);
}

/** 激活服务：用户默认 → 第一个已连接（注册表顺序即优先级）；全部未连接返回 null。 */
export function resolveActiveMapProvider(settings: SettingsStore): { id: string; label: string } | null {
  const preferred = settings.getMapProvider();
  const order = preferred ? [preferred, ...EXTERNAL_SERVICES.map((s) => s.id).filter((id) => id !== preferred)] : EXTERNAL_SERVICES.map((s) => s.id);
  for (const id of order) {
    if (settings.getExternalServiceKey(id)) {
      return { id, label: EXTERNAL_SERVICES.find((s) => s.id === id)?.name ?? id };
    }
  }
  return null;
}

const NOT_CONNECTED_MESSAGE =
  "尚未连接地图服务：请引导用户打开「训练」页的连接提示，或在设置中心「外部服务」页签里连接百度/高德/谷歌任一地图（免费或低成本申请）。连接后即可查询附近地点与测算步行/骑行路线。";

export function createMapTools(settings: SettingsStore, fetcher: MapFetcher = fetch): AgentTool<any>[] {
  const withProvider = (run: (provider: MapProvider) => Promise<string>): Promise<string> => {
    const active = resolveActiveMapProvider(settings);
    if (!active) return Promise.resolve(NOT_CONNECTED_MESSAGE);
    return run(buildProvider(active.id, settings, fetcher)).catch((e) => `地图查询失败：${safeProviderMessage(e, EXTERNAL_SERVICES.map((s) => settings.getExternalServiceKey(s.id)))}`);
  };

  return [
    {
      name: "search_nearby_places",
      label: "搜索附近地点",
      description:
        "按关键词（如 公园、操场、体育馆）搜索某地名/地址附近的地点，返回名称、地址与直线距离。用于户外训练规划时找路线锚点。需要已连接任一地图服务（设置中心·外部服务）。",
      parameters: SearchSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SearchSchema>;
        return {
          content: [
            text(
              await withProvider(async (provider) => {
                const center = await provider.geocode(p.location);
                const places = await provider.searchPlaces(p.keyword, center, (p.radius_km ?? 3) * 1000);
                if (!places.length) return `在「${p.location}」附近没有找到「${p.keyword}」相关的地点，可换关键词或扩大半径（数据来自${provider.label}）。`;
                return (
                  `在「${p.location}」附近找到的「${p.keyword}」（坐标 ${pointString(center)}，距离为直线距离，数据来自${provider.label}）：\n` +
                  places
                    .map((item, i) => `${i + 1}. ${item.name}（${item.address}${item.distanceKm != null ? `，约 ${item.distanceKm.toFixed(1)} km` : ""}）`)
                    .join("\n")
                );
              }),
            ),
          ],
          details: { keyword: p.keyword },
        };
      },
    },
    {
      name: "estimate_route",
      label: "测算步行/骑行路线",
      description:
        "测算两个地名之间步行或骑行的距离与预计耗时（基于地图路网）。用于把「跑 5 公里」这类目标落到具体路线与时间。需要已连接任一地图服务（设置中心·外部服务）。",
      parameters: RouteSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof RouteSchema>;
        return {
          content: [
            text(
              await withProvider(async (provider) => {
                const [origin, destination] = await Promise.all([
                  provider.geocode(p.origin),
                  provider.geocode(p.destination),
                ]);
                const route = await provider.route(origin, destination, p.mode);
                const km = (route.distanceM / 1000).toFixed(2);
                const minutes = Math.round(route.durationS / 60);
                return `「${p.origin}」→「${p.destination}」（${p.mode === "riding" ? "骑行" : "步行"}）：约 ${km} 公里，预计 ${minutes} 分钟（路线数据来自${provider.label}）。`;
              }),
            ),
          ],
          details: { mode: p.mode },
        };
      },
    },
  ];
}

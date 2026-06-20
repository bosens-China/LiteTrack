import IP2RegionImport from 'ip2region';

// ip2region 是 CJS 包（exports.default = class）。Node ESM 导入 CJS 时，
// default 会被再包一层成 { default: class }，必须取里层才是构造器；
// 同时兼容未来直接拿到构造器的运行时，避免 "not a constructor"。
const IP2Region =
  typeof IP2RegionImport === 'function'
    ? IP2RegionImport
    : (IP2RegionImport as { default: typeof IP2RegionImport }).default;

/** IP 离线查询出的地理信息（国家 / 城市），无法识别时为 null */
export interface GeoLookupResult {
  country: string | null;
  city: string | null;
}

/** ip2region 对私有 / 保留地址返回的占位值，统一视为未知 */
const JUNK_VALUES = new Set([
  '',
  '0',
  '内网IP',
  '保留地址',
  '本机地址',
  '局域网',
]);

type IP2RegionInstance = InstanceType<typeof IP2Region>;

// 单例：构造时会 readFileSync 载入 ~11MB 库到内存，只做一次
let query: IP2RegionInstance | null = null;
let initFailed = false;

function getQuery(): IP2RegionInstance | null {
  if (query) return query;
  if (initFailed) return null;
  try {
    query = new IP2Region();
    return query;
  } catch {
    // 库文件缺失等异常：地理查询整体降级为不可用，绝不影响埋点主流程
    initFailed = true;
    return null;
  }
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed && !JUNK_VALUES.has(trimmed) ? trimmed : null;
}

/** 规整 Fastify 的 request.ip：剥掉 IPv4-mapped IPv6 前缀、过滤无效值 */
function normalizeIp(ip: string): string | null {
  if (!ip || ip === 'unknown') return null;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : ip;
}

const EMPTY: GeoLookupResult = { country: null, city: null };

/**
 * 基于客户端 IP 离线查询地理信息（ip2region 内置库，国内省/市定位准确，
 * 海外仅到国家）。不连外网、不需 license key，适合国内部署。
 *
 * ⚠️ 仅当 `request.ip` 是真实客户端 IP 时才有意义——经反代部署务必先开启
 * `TRUST_PROXY`，否则取到的是反代内网地址，查不出有效地理。
 *
 * 任何异常都吞掉返回空 —— 地理是 best-effort，绝不能拖累上报主流程。
 */
export function lookupGeoByIp(ip: string): GeoLookupResult {
  const normalized = normalizeIp(ip);
  if (!normalized) return EMPTY;

  const q = getQuery();
  if (!q) return EMPTY;

  try {
    const res = q.search(normalized);
    if (!res) return EMPTY;
    // 城市优先取 city，缺失时退到 province（直辖市 / 省级精度）
    const city = clean(res.city) ?? clean(res.province);
    return { country: clean(res.country), city };
  } catch {
    return EMPTY;
  }
}

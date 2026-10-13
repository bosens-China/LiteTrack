//#region contracts/dist/path.mjs
function normalizePath(value) {
	return `/${(value.trim().split(/[?#]/, 1)[0] || "/").replace(/^\/+|\/+$/g, "")}`;
}

//#endregion
//#region src/core/errors.ts
function createLiteTrackError({ message, code, status, cause, context }) {
	const error = new Error(message);
	error.name = "LiteTrackError";
	error.code = code;
	error.status = status;
	error.cause = cause;
	error.context = context;
	return error;
}
function reportLiteTrackError({ error, debug, onError }) {
	try {
		if (debug && typeof console !== "undefined" && typeof console.error === "function") console.error("[LiteTrack]", error);
	} catch {}
	try {
		const result = onError?.(error);
		if (result) Promise.resolve(result).catch(() => {});
	} catch {}
}

//#endregion
//#region src/core/identity.ts
const memory = /* @__PURE__ */ new Map();
function createId() {
	return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function readIdentity(key) {
	try {
		const existing = window.localStorage.getItem(key);
		if (existing && /^[a-zA-Z0-9_-]{8,100}$/.test(existing)) {
			memory.set(key, existing);
			return existing;
		}
		const id = memory.get(key) ?? createId();
		window.localStorage.setItem(key, id);
		memory.set(key, id);
		return id;
	} catch {
		const id = memory.get(key) ?? createId();
		memory.set(key, id);
		return id;
	}
}
async function visitorId(siteToken) {
	const key = "lt:visitor:" + siteToken;
	if (typeof navigator !== "undefined" && navigator.locks) try {
		return await navigator.locks.request(key, () => readIdentity(key));
	} catch {}
	return readIdentity(key);
}

//#endregion
//#region contracts/dist/protocol.mjs
/** 只维护当前采集协议；与 npm SemVer 独立。 */
const PROTOCOL_VERSION = 1;

//#endregion
//#region src/core/version.ts
const SDK_VERSION = "2.0.0";

//#endregion
//#region src/core/client.ts
function create(options) {
	let endpoint;
	try {
		const base = new URL(options.baseUrl);
		if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("baseUrl 必须是 HTTP 地址");
		if (!/^[a-f0-9]{64}$/.test(options.siteToken)) throw new Error("siteToken 必须是 64 位十六进制字符串");
		if (options.timeoutMs !== void 0 && (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error("timeoutMs 必须是正整数");
		endpoint = options.baseUrl.replace(/\/+$/, "") + "/litetrack/collect";
	} catch (cause) {
		throw createLiteTrackError({
			code: "INVALID_OPTIONS",
			message: "LiteTrack 初始化参数无效",
			cause
		});
	}
	let destroyed = false;
	let currentPath;
	const report = (error) => reportLiteTrackError({
		error,
		debug: options.debug,
		onError: options.onError
	});
	async function send(payload) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 1e4);
		try {
			const identity = await visitorId(options.siteToken);
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Site-Token": options.siteToken,
					"X-LiteTrack-SDK": SDK_VERSION
				},
				body: JSON.stringify({
					...payload,
					visitorId: identity
				}),
				keepalive: true,
				signal: controller.signal
			});
			if (!response.ok) report(createLiteTrackError({
				code: "HTTP_ERROR",
				status: response.status,
				message: "LiteTrack 上报失败：" + response.status
			}));
		} catch (cause) {
			report(createLiteTrackError({
				code: controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
				message: "LiteTrack 上报未完成",
				cause
			}));
		} finally {
			clearTimeout(timer);
		}
	}
	return {
		page(input) {
			if (destroyed || typeof window === "undefined" || typeof document === "undefined") return;
			try {
				if (typeof fetch === "undefined" || typeof AbortController === "undefined") {
					report(createLiteTrackError({
						code: "ENVIRONMENT_ERROR",
						message: "当前浏览器需要 fetch 和 AbortController"
					}));
					return;
				}
				const rawPath = input?.path ?? window.location.pathname;
				if (typeof rawPath !== "string" || rawPath.length > 500) throw new Error("path 无效");
				const path = normalizePath(rawPath);
				if (currentPath === path && !input?.newVisit) return;
				const title = input?.title ?? document.title;
				if (typeof title !== "string") throw new Error("title 无效");
				const payload = {
					protocolVersion: PROTOCOL_VERSION,
					eventId: createId(),
					path,
					title: title.slice(0, 500),
					referrer: document.referrer.slice(0, 2048)
				};
				currentPath = path;
				send(payload);
			} catch (cause) {
				report(createLiteTrackError({
					code: "INVALID_OPTIONS",
					message: "LiteTrack 页面参数无效",
					cause
				}));
			}
		},
		destroy() {
			destroyed = true;
			currentPath = void 0;
		}
	};
}

//#endregion
export { create, SDK_VERSION as version };
//# sourceMappingURL=index.mjs.map
// ============================================================
// Auto Flow v5 — MAIN World Hook
// Runs at document_start BEFORE page loads
// 1) Patches click events to bypass isTrusted check
// 2) Intercepts Google Flow API calls
// ============================================================
(() => {
  "use strict";
  if (window.__afV2HookInstalled) return;
  window.__afV2HookInstalled = true;

  // ── Patch 1: Proxy isTrusted on click/pointer events ──
  // Google Flow checks event.isTrusted và reject programmatic clicks.
  // Wrap addEventListener cho click events → Proxy event với isTrusted: true.
  // Chạy trước React init → React event delegation nhận Proxy'd events.
  const CLICK_TYPES = ["click", "mousedown", "mouseup", "pointerdown", "pointerup"];
  const _origAEL = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (CLICK_TYPES.includes(type) && typeof listener === "function") {
      const wrapped = function (event) {
        const proxy = new Proxy(event, {
          get(t, p) {
            if (p === "isTrusted") return true;
            const v = t[p];
            return typeof v === "function" ? v.bind(t) : v;
          },
          getOwnPropertyDescriptor(t, p) {
            if (p === "isTrusted") {
              return { value: true, writable: false, enumerable: true, configurable: false };
            }
            return Object.getOwnPropertyDescriptor(t, p);
          },
        });
        return listener.call(this, proxy);
      };
      return _origAEL.call(this, type, wrapped, options);
    }
    return _origAEL.call(this, type, listener, options);
  };

  // ── Patch 2: navigator.userActivation always active ──
  // Một số API kiểm tra user gesture qua navigator.userActivation
  try {
    Object.defineProperty(navigator, "userActivation", {
      get: () => ({ isActive: true, hasBeenActive: true }),
      configurable: true,
    });
  } catch (_) {}

  console.log("[AutoFlow] ✅ Event trust patches installed");

  const nativeFetch = window.fetch.bind(window);

  // Classify API endpoint
  function classifyEndpoint(url) {
    const lower = String(url || "").toLowerCase();
    return {
      isGenSubmit:
        lower.includes("batchgenerateimages") ||
        lower.includes("generatevideo") ||
        lower.includes("batchasyncgenerate") ||
        lower.includes("generateimage"),
      isStatusCheck:
        lower.includes("batchcheckasync") ||
        lower.includes("generationstatus") ||
        lower.includes("videogenerationstatus"),
      isMediaUrl: lower.includes("getmediaurlredirect"),
    };
  }

  // Parse response body (Flow uses )]}' prefix)
  function parseBody(text) {
    if (!text) return null;
    const cleaned = text.replace(/^\)\]\}',?\s*/, "").trim();
    if (!cleaned) return null;
    try {
      return JSON.parse(cleaned);
    } catch {
      // Try extracting JSON object
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  // Broadcast API data to page consumers and extension listeners
  function broadcast(type, endpoint, data) {
    const payload = {
      type: "AF_V2_API",
      apiType: type,
      endpoint,
      data,
      timestamp: Date.now(),
    };

    window.postMessage(payload, "*");

    try {
      chrome?.runtime?.sendMessage?.(payload);
    } catch (_) {}
  }

  // Hook fetch
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const cls = classifyEndpoint(url);

    // Only intercept relevant calls
    if (!cls.isGenSubmit && !cls.isStatusCheck) {
      return nativeFetch.apply(this, args);
    }

    const result = nativeFetch.apply(this, args);

    // Clone response and extract data
    result
      .then((response) => {
        if (!response.ok) return;
        response
          .clone()
          .text()
          .then((text) => {
            const data = parseBody(text);
            if (!data) return;

            if (cls.isGenSubmit) {
              broadcast("GEN_SUBMIT", url, data);
            } else if (cls.isStatusCheck) {
              broadcast("STATUS_CHECK", url, data);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});

    return result;
  };

  // Also intercept Response.prototype.json for cases where
  // the page reads JSON directly instead of text
  const origJson = Response.prototype.json;
  Response.prototype.json = function (...args) {
    const url = String(this?.url || "");
    const cls = classifyEndpoint(url);
    const promise = origJson.apply(this, args);

    if (cls.isStatusCheck || cls.isGenSubmit) {
      promise
        .then((data) => {
          if (cls.isGenSubmit) broadcast("GEN_SUBMIT", url, data);
          else broadcast("STATUS_CHECK", url, data);
        })
        .catch(() => {});
    }

    return promise;
  };

  console.log("[Auto Flow v2] Fetch hook installed");
})();

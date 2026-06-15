// ============================================================
// Auto Flow v5 — Background Service Worker
// Handles: Side panel open + DOM click Create (no debugger)
// ============================================================

// --- Side Panel Setup ---
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.sidePanel.open({ windowId: tab.windowId });
});

console.log("[AutoFlow-BG] Background Service Worker initialized");

// --- Message Handler ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Forward fetch hook telemetry
  if (msg.type === "AF_V2_API") {
    try {
      chrome.runtime.sendMessage({ ...msg, __forwardedByBackground: true }, () => {
        void chrome.runtime?.lastError;
      });
    } catch (_) {}
    sendResponse?.({ ok: true });
    return;
  }

  if (msg.type === "AF_DOM_CLICK_CREATE") {
    (async () => {
      const tabId = msg.tabId;
      try {
        if (!Number.isInteger(tabId)) {
          sendResponse({ ok: false, error: "Invalid tabId" });
          return;
        }

        await chrome.tabs.update(tabId, { active: true });

        // Click nút Create bằng DOM .click()
        // fetch-hook.js đã patch addEventListener → Proxy isTrusted: true
        // → Google Flow sẽ nhận event như user click thật
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          func: () => {
            const all = Array.from(document.querySelectorAll('button, [role="button"]'));
            
            const target = all.find(b => {
              const t = b.textContent?.toLowerCase() || "";
              const hasCreate = t.includes("create") && t.length < 20;
              const hasIcon = !!b.querySelector('.google-symbols') && 
                              b.querySelector('.google-symbols').textContent === "arrow_forward";
              const isVisible = b.offsetWidth > 0 && b.offsetHeight > 0;
              const isLikely = b.classList.contains("eaSocK") || b.closest('.sc-e5032833-10');
              return (hasCreate || hasIcon) && isVisible && isLikely;
            }) || all.find(b => {
              const t = b.textContent?.toLowerCase() || "";
              return (t.includes("create") || b.innerHTML.includes("arrow_forward")) && b.offsetWidth > 0;
            });

            if (!target) {
              return { ok: false, error: "CREATE_NOT_FOUND" };
            }

            const label = target.textContent?.trim();

            // Simulate full pointer + click sequence
            // fetch-hook patches make these events appear trusted to all listeners
            target.focus();

            const rect = target.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const eventInit = { bubbles: true, cancelable: true, clientX: x, clientY: y };

            target.dispatchEvent(new PointerEvent("pointerdown", eventInit));
            target.dispatchEvent(new MouseEvent("mousedown", eventInit));
            target.dispatchEvent(new PointerEvent("pointerup", eventInit));
            target.dispatchEvent(new MouseEvent("mouseup", eventInit));
            target.dispatchEvent(new MouseEvent("click", eventInit));

            return { ok: true, text: label };
          }
        });

        const result = results?.[0]?.result;
        if (!result?.ok) {
          sendResponse({ ok: false, error: result?.error || "CREATE_NOT_FOUND" });
          return;
        }

        console.log(`[AutoFlow-BG] ✅ Click: "${result.text}"`);
        sendResponse({ ok: true });
      } catch (e) {
        console.error("[AutoFlow-BG] Lỗi:", e.message);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});

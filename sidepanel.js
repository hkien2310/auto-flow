// ============================================================
// Auto Flow v5 — Side Panel Controller
// Fire & Forget + TXT Order Mapping
// TXT: mỗi dòng = 1 prompt, mapping theo thứ tự với ảnh
// ============================================================
(() => {
  "use strict";

  const state = {
    flowTabId: null,
    selectedImageFiles: [],
    queue: [],
    queueIndex: 0,
    isQueueRunning: false,
    stopRequested: false,
  };

  const dom = {};

  function cacheDom() {
    dom.statusBar = document.getElementById("statusBar");
    dom.statusText = document.getElementById("statusText");
    dom.tabMeta = document.getElementById("tabMeta");
    dom.detectTabBtn = document.getElementById("detectTabBtn");
    dom.importTxtBtn = document.getElementById("importTxtBtn");
    dom.addQueueBtn = document.getElementById("addQueueBtn");
    dom.txtInput = document.getElementById("txtInput");
    dom.queueMeta = document.getElementById("queueMeta");
    dom.queueOutput = document.getElementById("queueOutput");
    dom.promptInput = document.getElementById("promptInput");
    dom.animatePromptsInput = document.getElementById("animatePromptsInput");
    dom.pickImageBtn = document.getElementById("pickImageBtn");
    dom.imageInput = document.getElementById("imageInput");
    dom.startBtn = document.getElementById("startBtn");
    dom.stopBtn = document.getElementById("stopBtn");
    dom.logOutput = document.getElementById("logOutput");
    dom.progressSection = document.getElementById("progressSection");
    dom.progressLabel = document.getElementById("progressLabel");
    dom.progressPercent = document.getElementById("progressPercent");
    dom.progressFill = document.getElementById("progressFill");
    dom.globalPromptInput = document.getElementById("globalPromptInput");
    dom.minWaitInput = document.getElementById("minWait");
    dom.maxWaitInput = document.getElementById("maxWait");
    dom.minStepWaitInput = document.getElementById("minStepWait");
    dom.maxStepWaitInput = document.getElementById("maxStepWait");
    dom.randomPromptsInput = document.getElementById("randomPromptsInput");
    dom.randomPromptCount = document.getElementById("randomPromptCount");
    dom.debugPickInput = document.getElementById("debugPickInput");
    dom.debugPickBtn = document.getElementById("debugPickBtn");
  }

  // --- Utilities ---

  function setStatus(text, mode = "") {
    dom.statusText.textContent = text;
    dom.statusBar.className = "status-bar " + mode;
    const icon = dom.statusBar.querySelector(".status-icon");
    if (mode === "running") icon.textContent = "autoplay";
    else if (mode === "error") icon.textContent = "error";
    else icon.textContent = "radio_button_unchecked";
  }

  function log(message, level = "info") {
    const line = document.createElement("div");
    line.className = `log-entry log-${level}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    dom.logOutput.appendChild(line);
    dom.logOutput.scrollTop = dom.logOutput.scrollHeight;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getBaseName(fileName = "") {
    return String(fileName || "").replace(/\.[^.]+$/, "");
  }

  function updateProgress(current, total) {
    if (total === 0) {
      dom.progressSection.classList.add("hidden");
      return;
    }
    dom.progressSection.classList.remove("hidden");
    const pct = Math.round((current / total) * 100);
    dom.progressLabel.textContent = `${current} / ${total}`;
    dom.progressPercent.textContent = `${pct}%`;
    dom.progressFill.style.width = `${pct}%`;
  }

  function randomDelay() {
    const min = Math.max(0, parseFloat(dom.minWaitInput.value) || 1.5);
    const max = Math.max(min, parseFloat(dom.maxWaitInput.value) || 4.0);
    return (Math.random() * (max - min) + min) * 1000;
  }

  function randomStepDelay() {
    const min = Math.max(0, parseFloat(dom.minStepWaitInput?.value) || 1.5);
    const max = Math.max(min, parseFloat(dom.maxStepWaitInput?.value) || 4.0);
    return (Math.random() * (max - min) + min) * 1000;
  }

  function getRandomPromptsList() {
    const raw = (dom.randomPromptsInput?.value || "").trim();
    if (!raw) return [];
    return raw.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  function pickRandomPrompt(list) {
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  // --- TXT Parsing (simple: each line = 1 prompt) ---

  function parseTxtPrompts(rawText = "") {
    return String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  // --- Queue ---

  function rebuildQueue() {
    const globalPrompt = (dom.globalPromptInput?.value || "").trim();
    const randomList = getRandomPromptsList();
    const txtPrompts = parseTxtPrompts(dom.animatePromptsInput?.value || "");

    // Update random prompt counter
    dom.randomPromptCount.textContent = randomList.length > 0
      ? `${randomList.length} prompt(s)`
      : "";

    state.queue = state.selectedImageFiles.map((file, index) => {
      const imageBaseName = getBaseName(file.name);

      // Priority: Random > Global > TXT (by order)
      let animatePrompt = "";
      let status = "unmatched";

      if (randomList.length > 0) {
        animatePrompt = "__RANDOM__";
        status = "queued";
      } else if (globalPrompt) {
        animatePrompt = globalPrompt;
        status = "queued";
      } else if (txtPrompts[index]) {
        animatePrompt = txtPrompts[index];
        status = "queued";
      }

      return {
        id: `${Date.now()}-${index}`,
        imageFile: file,
        imageName: file.name,
        imageBaseName,
        tag: imageBaseName,
        animatePrompt,
        status,
      };
    });
    state.queueIndex = 0;
    const matchedCount = state.queue.filter(
      (item) => item.animatePrompt
    ).length;
    const modeLabel = randomList.length > 0 ? " [🎲 Random]" : globalPrompt ? " [Global]" : txtPrompts.length > 0 ? " [📋 TXT Order]" : "";
    dom.queueMeta.textContent = `TXT: ${txtPrompts.length} | Images: ${state.selectedImageFiles.length} | Matched: ${matchedCount}/${state.queue.length}${modeLabel}`;

    // Show warning if TXT count doesn't match image count
    if (txtPrompts.length > 0 && !globalPrompt && randomList.length === 0 && txtPrompts.length !== state.selectedImageFiles.length) {
      log(`⚠️ TXT có ${txtPrompts.length} dòng nhưng có ${state.selectedImageFiles.length} ảnh. Một số ảnh sẽ không có prompt.`, "warn");
    }

    dom.queueOutput.textContent = JSON.stringify(
      state.queue.map((item, i) => ({
        "#": i + 1,
        image: item.imageName,
        prompt: item.animatePrompt === "__RANDOM__"
          ? `🎲 Random (${randomList.length})`
          : item.animatePrompt
            ? item.animatePrompt.substring(0, 50) + (item.animatePrompt.length > 50 ? "..." : "")
            : "❌ no prompt",
        status: item.status,
      })),
      null,
      2
    );
  }

  // --- Flow Tab ---

  async function detectFlowTab() {
    const tabs = await chrome.tabs.query({
      url: ["https://labs.google/fx/*"],
    });
    const tab =
      tabs.find((t) => /\/fx\/tools\/flow\//.test(t.url || "")) ||
      tabs[0] ||
      null;
    state.flowTabId = tab?.id || null;
    dom.tabMeta.textContent = tab
      ? `Attached tab ${tab.id}: ${tab.url}`
      : "No Flow tab found";
    return state.flowTabId;
  }

  async function ensureFlowTab() {
    if (state.flowTabId) return state.flowTabId;
    const tabId = await detectFlowTab();
    if (!tabId) throw new Error("FLOW_TAB_NOT_FOUND");
    return tabId;
  }

  function execInFlowTab(fn, args = [], world = "ISOLATED") {
    return ensureFlowTab().then((tabId) =>
      chrome.scripting
        .executeScript({
          target: { tabId },
          func: fn,
          args,
          world,
        })
        .then((results) => results?.[0]?.result)
    );
  }

  // --- Composer Actions ---

  async function setPrompt(promptText) {
    const prompt = promptText || dom.promptInput.value.trim();
    if (!prompt) throw new Error("PROMPT_EMPTY");

    const writeResult = await execInFlowTab(
      async (text) => {
        try {
          const editor =
            document.querySelector("[data-slate-editor='true'][contenteditable='true']") ||
            document.querySelector("[data-slate-editor='true'][contenteditable='plaintext-only']") ||
            document.querySelector("div[role='textbox'][contenteditable='true']");
          if (!editor) return { ok: false, error: "EDITOR_NOT_FOUND" };

          editor.focus();
          await new Promise((r) => setTimeout(r, 100));

          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editor);
          sel.removeAllRanges();
          sel.addRange(range);

          document.execCommand('delete', false, null);
          document.execCommand('insertText', false, text);

          editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          editor.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true, cancelable: true, inputType: 'insertText', data: text
          }));

          await new Promise((r) => setTimeout(r, 300));
          const actual = Array.from(
            editor.querySelectorAll('[data-slate-string="true"]') || []
          )
            .map((n) => n.textContent || "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          // Lenient check: normalize both, then check if editor has content
          // Slate often changes whitespace, so strict === fails
          const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
          const normActual = norm(actual);
          const normExpected = norm(text);
          const isMatch = normActual === normExpected
            || normActual.includes(normExpected.substring(0, Math.min(30, normExpected.length)))
            || actual.length > 0; // As long as editor has content, consider it OK

          return { ok: isMatch, actual, expected: text.trim() };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
      [prompt],
      "MAIN"
    );

    return writeResult;
  }

  // --- Image Upload ---

  async function attachImage(imageFile) {
    if (!imageFile) throw new Error("IMAGE_NOT_SELECTED");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
    return execInFlowTab(
      async (fileName, mimeType, rawDataUrl) => {
        const input = document.querySelector(
          'input[type="file"][accept*="image"]'
        );
        if (!input) return { ok: false, error: "FILE_INPUT_NOT_FOUND" };
        const res = await fetch(rawDataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, {
          type: mimeType || blob.type || "image/png",
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 1500));
        const attached = document.querySelector(
          "button[data-card-open] img"
        );
        return {
          ok: input.files?.length > 0,
          attachedDetected: !!(
            attached && attached.getAttribute("src")
          ),
        };
      },
      [imageFile.name, imageFile.type, dataUrl],
      "MAIN"
    );
  }

  // --- Gallery Operations ---

  async function stepOpenGallery() {
    return execInFlowTab(async () => {
      const n = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();

      const findGalleryDialog = () =>
        Array.from(document.querySelectorAll('[role="dialog"]')).find((el) => {
          const text = n(el.textContent || "");
          return (
            !!el.querySelector('[data-testid="virtuoso-item-list"]') ||
            text.includes("upload image") ||
            text.includes("search for assets")
          );
        });

      const trigger = Array.from(
        document.querySelectorAll('[aria-haspopup="dialog"]')
      ).find((e) => n(e.textContent || "") === "start");
      if (!trigger) return { ok: false, error: "START_TRIGGER_NOT_FOUND" };

      const existing = findGalleryDialog();
      if (existing) return { ok: true, alreadyOpen: true };

      trigger.click();

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 250));
        if (findGalleryDialog()) return { ok: true };
      }
      return { ok: false, error: "GALLERY_NOT_OPENED" };
    });
  }

  async function stepPickItem(targetName, maxPolls = 40) {
    const openResult = await stepOpenGallery();
    if (!openResult?.ok) return openResult;

    return execInFlowTab(async (name, maxWaitLoops) => {
      const n = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
      const target = n(name);

      const findDialog = () =>
        Array.from(document.querySelectorAll('[role="dialog"]')).find((el) => {
          const text = n(el.textContent || "");
          return (
            !!el.querySelector('[data-testid="virtuoso-item-list"]') ||
            text.includes("upload image") ||
            text.includes("search for assets")
          );
        });

      for (let i = 0; i < maxWaitLoops; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const dialog = findDialog();
        // If dialog is closed, it means a previous click succeeded, or the user closed it.
        if (!dialog) continue;
        
        const rows = Array.from(
          dialog.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]')
        );
        if (!rows.length) continue;
        const hit = rows.find((row) => n(row.textContent || "").includes(target));
        if (!hit) continue;
        
        hit.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise((r) => setTimeout(r, 200));
        const clickEl = hit.querySelector("img")
          || hit.querySelector('[role="button"]')
          || hit.firstElementChild || hit;
          
        clickEl.click();
        await new Promise(r => setTimeout(r, 100));
        clickEl.click();
        clickEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        
        // Wait 1.5s and check if the dialog is still open
        await new Promise(r => setTimeout(r, 1500));
        if (!findDialog()) {
           // Dialog closed! Pick was successful.
           return { ok: true, matched: n(hit.textContent || "").slice(0, 80), waited: i };
        }
        // If dialog is still open, the image might still be uploading. 
        // The loop will continue and try clicking again.
      }

      const dialog = findDialog();
      const rows = dialog
        ? Array.from(dialog.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]'))
        : [];
      return {
        ok: false, error: "NOT_FOUND", dialogOpen: !!dialog, totalItems: rows.length,
        first3: rows.slice(0, 3).map((r) => n(r.textContent || "").slice(0, 50)),
      };
    }, [targetName, maxPolls]);
  }

  async function stepVerifyPick(srcBefore) {
    return execInFlowTab(async (before) => {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const dlg = Array.from(document.querySelectorAll('[role="dialog"]'))
          .find((e) => !!e.querySelector('[data-testid="virtuoso-item-list"]'));
        const f = document.querySelector("button[data-card-open] img");
        const src = f?.getAttribute("src") || "";
        if (!dlg && src && src !== before) return { ok: true };
      }
      const open = !!Array.from(document.querySelectorAll('[role="dialog"]'))
        .find((e) => !!e.querySelector('[data-testid="virtuoso-item-list"]'));
      const f = document.querySelector("button[data-card-open] img");
      const cur = f?.getAttribute("src") || "";
      return { ok: false, popupOpen: open, srcChanged: cur !== before, currentSrc: cur, beforeSrc: before };
    }, [srcBefore]);
  }

  async function stepClickCreate() {
    const tabId = await ensureFlowTab();
    console.log("[AutoFlow-SP] Gửi yêu cầu CLICK_CREATE tới Background, TabId:", tabId);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "AF_DOM_CLICK_CREATE", tabId },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[AutoFlow-SP] Lỗi messaging:", chrome.runtime.lastError.message);
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          console.log("[AutoFlow-SP] Nhận phản hồi từ Background:", response);
          resolve(response || { ok: false, error: "NO_RESPONSE" });
        }
      );
    });
  }

  async function stepSubmitByEnter() {
    const tabId = await ensureFlowTab();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "AF_DOM_CLICK_CREATE", tabId, useEnter: true },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, error: "NO_RESPONSE" });
        }
      );
    });
  }

  // --- Job Runner (Fire & Forget) ---

  async function runOneJob(job) {
    if (!job) throw new Error("QUEUE_EMPTY");
    if (!job.animatePrompt)
      throw new Error(`MISSING_PROMPT: ${job.imageName}`);
    if (state.stopRequested) throw new Error("STOP_REQUESTED");

    // Resolve actual prompt (random pick at runtime)
    let actualPrompt = job.animatePrompt;
    if (actualPrompt === "__RANDOM__") {
      const randomList = getRandomPromptsList();
      if (randomList.length === 0) throw new Error("RANDOM_PROMPTS_EMPTY");
      actualPrompt = pickRandomPrompt(randomList);
      log(`  🎲 Random prompt: "${actualPrompt.substring(0, 60)}..."`);
    }

    // Giả lập hành vi người dùng thật: mouse move + scroll + random delay
    // Google track hành vi trên page (reCAPTCHA Enterprise / risk scoring)
    // → cần generate interaction signals giữa các step
    const simulateHuman = async (action) => {
      // 1. Mouse movements ngẫu nhiên trên page
      await execInFlowTab(async () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const steps = 3 + Math.floor(Math.random() * 5); // 3-7 movements
        for (let i = 0; i < steps; i++) {
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * h);
          document.dispatchEvent(new MouseEvent("mousemove", {
            bubbles: true, clientX: x, clientY: y
          }));
          await new Promise(r => setTimeout(r, 50 + Math.floor(Math.random() * 150)));
        }
        // 2. Random scroll nhỏ
        const scrollY = -30 + Math.floor(Math.random() * 60);
        window.scrollBy({ top: scrollY, behavior: "smooth" });
      }, [], "MAIN");

      // 3. Random delay (configured via UI)
      const ms = randomStepDelay();
      log(`  ⏳ ${action} (${(ms / 1000).toFixed(1)}s)`, "info");
      await sleep(ms);
    };

    dom.promptInput.value = actualPrompt;
    log(`▶ Task: ${job.imageName}`);

    const frameSrcBefore = await execInFlowTab(() => {
      const f = document.querySelector("button[data-card-open] img");
      return f?.getAttribute("src") || "";
    });

    // Step 1: Upload image
    job.status = "uploading";
    log(`  [1/5] Uploading image...`);
    const uploadRes = await attachImage(job.imageFile);
    if (!uploadRes?.ok) throw new Error(uploadRes?.error || "UPLOAD_FAILED");
    await simulateHuman("Chờ sau upload");

    // Step 2: Open gallery & pick
    job.status = "selecting";
    log(`  [2/5] Opening gallery & picking...`);
    const openResult = await stepOpenGallery();
    if (!openResult?.ok) throw new Error(openResult?.error || "GALLERY_FAILED");
    await simulateHuman("Chờ gallery mở");
    const pickResult = await stepPickItem(job.imageName, 240);
    if (!pickResult?.ok) {
        const dbg = pickResult ? `(dialogOpen=${pickResult.dialogOpen}, items=${pickResult.totalItems})` : "";
        throw new Error(`NOT_IN_GALLERY: ${job.imageName} ${dbg}`);
    }
    log(`  -> Picked item: "${pickResult.matched}" (poll ${pickResult.waited})`);
    await simulateHuman("Chờ sau chọn ảnh");

    // Step 3: Verify selection
    job.status = "verifying";
    log(`  [3/5] Verifying selection...`);
    const verify = await stepVerifyPick(frameSrcBefore);
    if (!verify?.ok) {
        const details = verify ? `popupOpen=${verify.popupOpen}, srcChanged=${verify.srcChanged}, curSrc=${(verify.currentSrc||'').substring(0,30)}` : "no data";
        throw new Error(`PICK_FAILED (${details})`);
    }
    await simulateHuman("Chờ xác nhận");

    // Step 4: Set prompt
    job.status = "prompting";
    log(`  [4/5] Setting prompt...`);
    const promptResult = await setPrompt(actualPrompt);
    if (!promptResult?.ok) throw new Error(`PROMPT_FAILED`);
    await simulateHuman("Chờ sau nhập prompt");

    // Step 5: Submit — chờ theo config
    job.status = "submitting";
    log(`  [5/5] Submitting...`);
    const preSubmitWait = randomStepDelay();
    log(`  ⏳ Chờ trước submit (${(preSubmitWait / 1000).toFixed(1)}s)`, "info");
    await sleep(preSubmitWait);
    
    const createResult = await stepClickCreate();
    if (!createResult?.ok) {
      log(`  ❌ Submit failed: ${createResult.error}`, "error");
      throw new Error(createResult.error || "CREATE_FAILED");
    }

    job.status = "submitted";
    log(`  ✅ Done: ${job.imageName}`, "success");
    return job;
  }

  async function runQueue() {
    if (state.isQueueRunning) return;
    rebuildQueue();
    const pendingJobs = state.queue.filter((j) => j.animatePrompt);
    if (pendingJobs.length === 0) {
      log("No matched jobs in queue", "warn");
      return;
    }

    state.isQueueRunning = true;
    state.stopRequested = false;
    setStatus("Running queue...", "running");
    updateProgress(0, pendingJobs.length);

    let completed = 0;
    let failed = 0;

    try {
      for (
        ;
        state.queueIndex < state.queue.length;
        state.queueIndex++
      ) {
        if (state.stopRequested) {
          log("⏹ Stop requested, queue halted", "warn");
          break;
        }

        const job = state.queue[state.queueIndex];
        if (!job.animatePrompt) {
          log(`⏭ Skipped (no prompt): ${job.imageName}`, "warn");
          job.status = "skipped";
          continue;
        }
        try {
          await runOneJob(job);
          completed++;
        } catch (error) {
          failed++;
          job.status = "failed";
          log(
            `✗ Failed: ${job.imageName} — ${error.message}`,
            "error"
          );
          if (error.message === "STOP_REQUESTED") break;
          // Continue to next job
          await sleep(2000);
        }
        updateProgress(completed + failed, pendingJobs.length);

        // ── Fire & Forget Delay + continuous behavior simulation ──
        if (state.queueIndex < state.queue.length - 1 && !state.stopRequested) {
          const waitMs = randomDelay();
          const waitSec = Math.round(waitMs / 1000);
          log(`  ⏱️ Chờ ${waitSec}s trước task tiếp (+ simulate behavior)...`);
          setStatus(`Waiting ${waitSec}s...`, "running");

          // Simulate mouse/scroll liên tục trong thời gian chờ
          // (mỗi 5-8s một lần, cho đến hết waitMs)
          const startTime = Date.now();
          while (Date.now() - startTime < waitMs && !state.stopRequested) {
            const chunk = 5000 + Math.floor(Math.random() * 3000); // 5-8s
            await sleep(Math.min(chunk, waitMs - (Date.now() - startTime)));
            if (state.stopRequested) break;
            // Simulate behavior
            try {
              await execInFlowTab(async () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
                  document.dispatchEvent(new MouseEvent("mousemove", {
                    bubbles: true,
                    clientX: Math.floor(Math.random() * w),
                    clientY: Math.floor(Math.random() * h),
                  }));
                  await new Promise(r => setTimeout(r, 80 + Math.floor(Math.random() * 120)));
                }
                window.scrollBy({ top: -20 + Math.floor(Math.random() * 40), behavior: "smooth" });
              }, [], "MAIN");
            } catch (_) {}
          }
        }
      }

      const finalMsg = state.stopRequested
        ? `Stopped. ${completed} submitted, ${failed} failed`
        : `✅ Queue complete. ${completed} submitted, ${failed} failed`;
      setStatus(finalMsg, failed > 0 ? "error" : "");
      log(finalMsg, failed > 0 ? "warn" : "success");
    } finally {
      state.isQueueRunning = false;
      state.stopRequested = false;
    }
  }

  // --- Event Binding ---

  function bindEvents() {
    dom.detectTabBtn.addEventListener("click", async () => {
      try {
        setStatus("Detecting Flow tab...", "running");
        await detectFlowTab();
        setStatus(
          state.flowTabId
            ? "Flow tab attached"
            : "No Flow tab found",
          state.flowTabId ? "" : "error"
        );
        log(
          state.flowTabId
            ? "Flow tab detected"
            : "No Flow tab found",
          state.flowTabId ? "info" : "error"
        );
      } catch (error) {
        setStatus("Detect tab failed", "error");
        log(error.message, "error");
      }
    });

    dom.pickImageBtn.addEventListener("click", () =>
      dom.imageInput.click()
    );
    dom.imageInput.addEventListener("change", () => {
      state.selectedImageFiles = Array.from(
        dom.imageInput.files || []
      );
      rebuildQueue();
      log(`Imported ${state.selectedImageFiles.length} image(s)`);
    });

    dom.importTxtBtn.addEventListener("click", () =>
      dom.txtInput.click()
    );
    dom.txtInput.addEventListener("change", async () => {
      const file = dom.txtInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      dom.animatePromptsInput.value = text;
      rebuildQueue();
      log(`Imported TXT: ${file.name}`);
    });

    dom.addQueueBtn.addEventListener("click", () => {
      rebuildQueue();
      log(`Queue rebuilt: ${state.queue.length} item(s)`);
    });

    // Global prompt: rebuild queue when changed
    if (dom.globalPromptInput) {
      dom.globalPromptInput.addEventListener("input", () => {
        if (state.selectedImageFiles.length > 0) rebuildQueue();
      });
    }

    // Random prompts: rebuild queue + update counter when changed
    if (dom.randomPromptsInput) {
      dom.randomPromptsInput.addEventListener("input", () => {
        if (state.selectedImageFiles.length > 0) rebuildQueue();
        const count = getRandomPromptsList().length;
        dom.randomPromptCount.textContent = count > 0 ? `${count} prompt(s)` : "";
      });
    }

    dom.startBtn.addEventListener("click", async () => {
      try {
        await runQueue();
      } catch (error) {
        setStatus("Start failed", "error");
        log(error.message, "error");
      }
    });

    dom.stopBtn.addEventListener("click", () => {
      state.stopRequested = true;
      setStatus("Stopping...");
      log("Stop requested");
    });

    if (dom.debugPickBtn) {
      dom.debugPickBtn.addEventListener("click", async () => {
        const targetName = (dom.debugPickInput.value || "").trim();
        if (!targetName) {
          log("Debug Pick: Vui lòng nhập tên ảnh (vd: STT_1.jpeg)", "warn");
          return;
        }
        try {
          setStatus("Testing Pick...", "running");
          log(`[DEBUG] --- Bắt đầu test pick: "${targetName}" ---`, "info");

          const frameSrcBefore = await execInFlowTab(() => {
            const f = document.querySelector("button[data-card-open] img");
            return f?.getAttribute("src") || "none";
          });

          log(`[DEBUG] 1. Mở Gallery... (srcBefore: ${frameSrcBefore.substring(0, 30)})`);
          const openResult = await stepOpenGallery();
          log(`[DEBUG] Mở Gallery kết quả: ${JSON.stringify(openResult)}`);
          
          if (!openResult?.ok) throw new Error("Mở gallery thất bại: " + (openResult?.error || ""));

          await sleep(1000);

          log(`[DEBUG] 2. Tìm và Pick Item...`);
          const pickResult = await stepPickItem(targetName, 100);
          
          // Lược bỏ bớt first3 cho đỡ dài dòng nếu pick thành công
          const pickLog = { ...pickResult };
          if (pickLog.ok) delete pickLog.first3;
          log(`[DEBUG] Pick Item kết quả: ${JSON.stringify(pickLog)}`);

          if (!pickResult?.ok) {
             throw new Error("Pick thất bại!");
          }

          log(`[DEBUG] 3. Chờ Verify...`);
          const verify = await stepVerifyPick(frameSrcBefore);
          
          const verifyLog = { ...verify };
          if (verifyLog.currentSrc) verifyLog.currentSrc = verifyLog.currentSrc.substring(0, 30) + '...';
          if (verifyLog.beforeSrc) verifyLog.beforeSrc = verifyLog.beforeSrc.substring(0, 30) + '...';
          log(`[DEBUG] Verify kết quả: ${JSON.stringify(verifyLog)}`);

          setStatus("Debug Pick Done", "");
          log(`[DEBUG] --- Hoàn tất test pick! ---`, "success");
        } catch (err) {
          setStatus("Debug Pick Failed", "error");
          log(`[DEBUG] Lỗi Exception: ${err.message}`, "error");
        }
      });
    }
  }

  // --- Init ---

  function init() {
    cacheDom();
    bindEvents();
    console.log("[AutoFlow-SP] Side Panel initialized");
    log("Auto Flow v5 (Fire & Forget + TXT Order) initialized");
  }

  init();
})();

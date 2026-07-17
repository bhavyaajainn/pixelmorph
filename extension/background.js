// PixelMorph Background Service Worker
let pixelMorphWindowId = null;
let activeTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ pixelmorph_state: null });
});

// Open a floating window instead of a popup so it doesn't close on outside click
chrome.action.onClicked.addListener((tab) => {
  activeTabId = tab.id;

  // Inject content script into the tab in case the page was open before the
  // extension was installed or reloaded ("Receiving end does not exist" fix)
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    }).catch(() => {
      // Restricted page (chrome://, Web Store, etc.) — silently ignore
    });
  }

  if (pixelMorphWindowId !== null) {
    chrome.windows.update(pixelMorphWindowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        pixelMorphWindowId = null;
        openWindow();
      }
    });
    return;
  }
  openWindow();
});

function openWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 360,
    height: 630,
    focused: true,
  }, (win) => {
    pixelMorphWindowId = win.id;
  });
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === pixelMorphWindowId) pixelMorphWindowId = null;
});

// Keep activeTabId up to date when the user switches tabs
chrome.tabs.onActivated.addListener((info) => {
  // Only update if the activated tab is not the PixelMorph popup window
  chrome.windows.get(info.windowId, (win) => {
    if (win.type !== "popup") activeTabId = info.tabId;
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_ACTIVE_TAB") {
    sendResponse({ tabId: activeTabId });
    return true;
  }

  if (message.type === "PIXELMORPH_SAVE_STATE") {
    chrome.storage.local.set({ pixelmorph_state: message.payload }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Box capture "done" signal: write a tiny flag — popup polls for it,
  // then pulls the actual data directly from the content script via tabs.sendMessage
  if (message.type === "CAPTURE_SCREENSHOT") {
    if (!activeTabId) { sendResponse({ screenshot: null }); return true; }
    chrome.tabs.get(activeTabId, (tab) => {
      if (chrome.runtime.lastError || !tab?.windowId) { sendResponse({ screenshot: null }); return; }
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) { sendResponse({ screenshot: null }); return; }
        // Strip the data:image/jpeg;base64, prefix — Gemini wants raw base64
        sendResponse({ screenshot: dataUrl.split(",")[1] ?? null });
      });
    });
    return true;
  }

  if (message.type === "PIXELMORPH_BOX_DONE") {
    console.log("STEP 6 (background): Received BOX_DONE. Writing flag to storage...");
    chrome.storage.local.set({ pixelmorph_box_done: Date.now() }, () => {
      console.log("STEP 6 (background): Flag written to storage successfully.");
    });
    sendResponse({ ok: true });
    return true;
  }
});

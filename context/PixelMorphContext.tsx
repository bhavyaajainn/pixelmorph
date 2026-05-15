"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import type {
  PixelMorphState, PixelMorphActions,
  TabId, ColorToken, TextOverride, Preset, ElementInfo, FontRole,
  CapturedImage, CapturedBackground, DOMNode, NodeChange,
} from "@/types";

const INITIAL_PRESETS: Preset[] = [
  { id: "midnight-violet", name: "Midnight Violet", swatches: ["#7B61FF", "#C8F542", "#0C0C0E"], modCount: 0 },
  { id: "clean-light",     name: "Clean Light",     swatches: ["#635BFF", "#FFFFFF", "#0A2540"], modCount: 0 },
  { id: "emerald",         name: "Emerald",          swatches: ["#10B981", "#064E3B", "#F0FDF4"], modCount: 0 },
];

type ContextValue = PixelMorphState & PixelMorphActions;
const PixelMorphContext = createContext<ContextValue | null>(null);

const cr = () => (globalThis as any).chrome as any;
const isExt = () =>
  typeof (globalThis as any).chrome !== "undefined" &&
  !!(globalThis as any).chrome?.runtime?.id;

// Inject content script into a tab, then run callback
function injectScript(tabId: number, cb: () => void) {
  (cr() as any).scripting.executeScript(
    { target: { tabId }, files: ["content.js"] },
    () => {
      // Give the script a moment to register its listeners
      setTimeout(cb, 150);
    }
  );
}

export function PixelMorphProvider({ children }: { children: ReactNode }) {
  const [isEnabled,           setEnabledState]       = useState(true);
  const [activeTab,           setActiveTab]           = useState<TabId>("dom");
  const [selectedElement,     setSelectedElement]     = useState<string | null>(null);
  const [selectedElementInfo, setSelectedElementInfo] = useState<ElementInfo | null>(null);
  const [isPicking,           setIsPicking]           = useState(false);
  const [isCapturing,         setIsCapturing]         = useState(false);
  const [captureError,        setCaptureError]        = useState<string | null>(null);
  const [colorTokens,         setColorTokens]         = useState<ColorToken[]>([]);
  const [fontRoles,           setFontRoles]           = useState<FontRole[]>([]);
  const [activeFontId,        setActiveFontId]        = useState("");
  const [borderRadius,        setBorderRadiusRaw]     = useState(8);
  const [paddingScale,        setPaddingScaleRaw]     = useState(16);
  const [fontScale,           setFontScaleRaw]        = useState(100);
  const [textOverrides,       setTextOverrides]       = useState<TextOverride[]>([]);
  const [brandFind,           setBrandFind]           = useState("");
  const [brandReplace,        setBrandReplace]        = useState("");
  const [activePresetId,      setActivePresetId]      = useState<string | null>(null);
  const [presets,             setPresets]             = useState<Preset[]>(INITIAL_PRESETS);
  const [changesCount,        setChangesCount]        = useState(0);
  const [currentSite,         setCurrentSite]         = useState("—");
  const [capturedImages,      setCapturedImages]      = useState<CapturedImage[]>([]);
  const [capturedBackgrounds, setCapturedBackgrounds] = useState<CapturedBackground[]>([]);
  const [domTree,             setDomTree]             = useState<DOMNode | null>(null);
  const [isScanning,          setIsScanning]          = useState(false);
  const [selectedNodeId,      setSelectedNodeId]      = useState<number | null>(null);
  const [nodeChanges,         setNodeChanges]         = useState<Record<number, NodeChange>>({});
  const [boxCaptures,         setBoxCaptures]         = useState<DOMNode[][]>([]);

  const tabIdRef          = useRef<number | null>(null);
  const nodeLocatorRef    = useRef<Record<number, { tag: string; text: string | null; elId: string | null; classes: string[]; path?: string }>>({});
  const boxPollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevents two overlapping storage.get callbacks from processing the same capture twice
  const boxPollDoneRef    = useRef(false);

  // ── Core: send message, auto-inject + retry once if content script missing ─
  const sendToTab = useCallback((
    type: string,
    payload: Record<string, unknown>,
    onResult: (r: any) => void,
    isRetry = false,
  ) => {
    const tabId = tabIdRef.current;
    if (tabId === null) {
      setCaptureError("Not connected to a page — close and reopen PixelMorph.");
      setIsCapturing(false);
      return;
    }

    cr().tabs.sendMessage(tabId, { type, ...payload }, (result: any) => {
      const err = (cr() as any).runtime.lastError;
      if (err) {
        if (!isRetry) {
          // Content script not present — inject it, then retry
          injectScript(tabId, () => sendToTab(type, payload, onResult, true));
          return;
        }
        setCaptureError("Cannot reach the page. Try refreshing it, then reopen PixelMorph.");
        setIsCapturing(false);
        return;
      }
      setCaptureError(null);
      onResult(result);
    });
  }, []);

  // ── On mount: resolve active tab, load page info ───────────────────────────
  useEffect(() => {
    if (!isExt()) return;

    cr().runtime.sendMessage({ type: "GET_ACTIVE_TAB" }, (res: any) => {
      if ((cr() as any).runtime.lastError) return;
      const tabId: number | undefined = res?.tabId;
      if (!tabId) return;
      tabIdRef.current = tabId;

      cr().tabs.get(tabId, (tab: any) => {
        if ((cr() as any).runtime.lastError) return;
        try { if (tab?.url) setCurrentSite(new URL(tab.url).hostname); } catch (_) {}
      });

      // Ensure content script is present, then get page info
      injectScript(tabId, () => {
        cr().tabs.sendMessage(tabId, { type: "PIXELMORPH_GET_PAGE_INFO" }, (r: any) => {
          if ((cr() as any).runtime.lastError) return;
          if (r?.info) setSelectedElementInfo(r.info);
        });
      });
    });


    const handler = (msg: any) => {
      if (msg.type === "PIXELMORPH_ELEMENT_SELECTED") {
        setSelectedElementInfo(msg.payload);
        setSelectedElement(msg.payload.selector);
        setIsPicking(false);
      }
      if (msg.type === "PIXELMORPH_PICK_CANCELLED") setIsPicking(false);
      // (PIXELMORPH_BOX_SELECTED now arrives via storage, not runtime message)
    };
    cr().runtime.onMessage.addListener(handler);
    return () => {
      cr().runtime.onMessage.removeListener(handler);
    };
  }, []);

  // ── Capture ────────────────────────────────────────────────────────────────

  const resetColors    = useCallback(() => { setColorTokens([]); setFontRoles([]); setActiveFontId(""); setChangesCount(0); setCaptureError(null); }, []);
  const resetText      = useCallback(() => { setTextOverrides([]); setBrandFind(""); setBrandReplace(""); setChangesCount(0); setCaptureError(null); }, []);
  const resetResources = useCallback(() => { setCapturedImages([]); setCapturedBackgrounds([]); setCaptureError(null); }, []);

  const captureColors = useCallback(() => {
    if (!isExt()) return;
    setIsCapturing(true);
    setCaptureError(null);

    sendToTab("PIXELMORPH_CAPTURE_COLORS", {}, (result: any) => {
      setIsCapturing(false);
      if (!result) { setCaptureError("Page returned no data."); return; }
      const { colors = [], fonts = [] } = result;
      if (colors.length) setColorTokens(colors.map((c: any, i: number) => ({ id: String(i + 1), label: c.label, hex: c.hex })));
      if (fonts.length) { setFontRoles(fonts.map((f: any) => ({ id: f.id, family: f.family, role: f.role, roleLabel: f.roleLabel }))); setActiveFontId(fonts[0]?.id ?? ""); }
      setChangesCount(0);
    });
  }, [sendToTab]);

  const captureText = useCallback(() => {
    if (!isExt()) return;
    setIsCapturing(true);
    setCaptureError(null);

    sendToTab("PIXELMORPH_CAPTURE_TEXT", {}, (result: any) => {
      setIsCapturing(false);
      if (!result) { setCaptureError("Page returned no data."); return; }
      const { textItems = [] } = result;
      if (textItems.length) setTextOverrides(textItems.map((t: any, i: number) => ({ id: String(Date.now() + i), selector: t.selector, original: t.text, replacement: t.text })));
      setChangesCount(0);
    });
  }, [sendToTab]);

  const captureResources = useCallback(() => {
    if (!isExt()) return;
    setIsCapturing(true);
    setCaptureError(null);

    sendToTab("PIXELMORPH_CAPTURE_RESOURCES", {}, (result: any) => {
      setIsCapturing(false);
      if (!result) { setCaptureError("Page returned no data."); return; }
      setCapturedImages(result.images ?? []);
      setCapturedBackgrounds(result.backgrounds ?? []);
    });
  }, [sendToTab]);

  // ── Apply Changes → push live CSS to the page ──────────────────────────────

  const applyChanges = useCallback(() => {
    if (!isExt()) return;
    setCaptureError(null);

    // Push every pending change to the page, with locator so elements can be
    // found even if data-pm-id attributes were lost due to page re-renders.
    Object.entries(nodeChanges).forEach(([id, changes]) => {
      const numId = Number(id);
      const locator = nodeLocatorRef.current[numId] ?? null;
      sendToTab("PIXELMORPH_APPLY_NODE", { pmId: numId, changes, locator }, () => {});
    });

    cr().runtime.sendMessage({ type: "PIXELMORPH_SAVE_STATE", payload: { nodeChanges } });
    setChangesCount(0);
  }, [sendToTab, nodeChanges]);

  // ── DOM scan & node editing ────────────────────────────────────────────────

  // Recursively index all nodes in the tree into nodeLocatorRef
  function indexTree(node: DOMNode) {
    nodeLocatorRef.current[node.id] = {
      tag: node.tag, text: node.text, elId: node.elId,
      classes: node.classes, path: node.path,
    };
    node.children.forEach(indexTree);
  }

  const scanDOM = useCallback(() => {
    if (!isExt()) return;
    setIsScanning(true);
    setCaptureError(null);
    setSelectedNodeId(null);
    setNodeChanges({});
    nodeLocatorRef.current = {};

    sendToTab("PIXELMORPH_SCAN_DOM", {}, (result: any) => {
      setIsScanning(false);
      if (!result?.tree) { setCaptureError("Could not scan page DOM."); return; }
      setDomTree(result.tree);
      indexTree(result.tree);
    });
  }, [sendToTab]);

  const selectNode = useCallback((id: number | null) => {
    setSelectedNodeId(id);
    if (!isExt()) return;
    const locator = nodeLocatorRef.current[id] ?? null;
    sendToTab("PIXELMORPH_HIGHLIGHT_NODE", { pmId: id, locator }, () => {});
  }, [sendToTab]);

  const applyNodeChange = useCallback((id: number, changes: NodeChange) => {
    setNodeChanges(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...changes } }));
    if (!isExt()) return;
    const locator = nodeLocatorRef.current[id] ?? null;
    sendToTab("PIXELMORPH_APPLY_NODE", { pmId: id, changes, locator }, () => {});
    setChangesCount(c => c + 1);
  }, [sendToTab]);

  // ── Undo all node changes ──────────────────────────────────────────────────

  function findNodeInTree(tree: DOMNode | null, id: number): DOMNode | null {
    if (!tree) return null;
    if (tree.id === id) return tree;
    for (const c of tree.children) { const f = findNodeInTree(c, id); if (f) return f; }
    return null;
  }

  const undoAll = useCallback(() => {
    if (!isExt()) return;
    Object.keys(nodeChanges).forEach(id => {
      const numId = Number(id);
      const node = findNodeInTree(domTree, numId);
      const locator = nodeLocatorRef.current[numId] ?? null;
      sendToTab("PIXELMORPH_RESET_NODE", {
        pmId: numId,
        originalText: node?.text ?? null,
        locator,
      }, () => {});
    });
    setNodeChanges({});
    setChangesCount(0);
  }, [sendToTab, nodeChanges, domTree]);

  // ── Box selection ──────────────────────────────────────────────────────────

  const startBoxSelect = useCallback(() => {
    if (!isExt()) return;

    // Kill any previous poll and reset the processed guard
    if (boxPollRef.current) { clearInterval(boxPollRef.current); boxPollRef.current = null; }
    boxPollDoneRef.current = false;
    cr().storage.local.remove("pixelmorph_box_done");

    sendToTab("PIXELMORPH_CANCEL_BOX", {}, () => {
      sendToTab("PIXELMORPH_START_BOX", {}, () => {});
    });

    boxPollRef.current = setInterval(() => {
      cr().storage.local.get(["pixelmorph_box_done"], (res: any) => {
        // Guard: two overlapping storage.get callbacks can both see the flag
        if (boxPollDoneRef.current || !res?.pixelmorph_box_done) return;
        boxPollDoneRef.current = true;

        if (boxPollRef.current) { clearInterval(boxPollRef.current); boxPollRef.current = null; }
        cr().storage.local.remove("pixelmorph_box_done");

        sendToTab("PIXELMORPH_GET_BOX_RESULT", {}, (result: any) => {
          const nodes: DOMNode[] = result?.nodes ?? [];
          if (nodes.length === 0) return;
          nodes.forEach(n => {
            nodeLocatorRef.current[n.id] = { tag: n.tag, text: n.text, elId: n.elId, classes: n.classes, path: n.path };
          });
          setBoxCaptures(prev => [...prev, nodes]);
        });
      });
    }, 150);

    // Safety timeout — stop polling after 2 minutes
    setTimeout(() => {
      if (boxPollRef.current) { clearInterval(boxPollRef.current); boxPollRef.current = null; }
    }, 120_000);
  }, [sendToTab]);

  const clearBoxCapture = useCallback((index: number) => {
    setBoxCaptures(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reorderBoxCaptures = useCallback((from: number, to: number) => {
    setBoxCaptures(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  // ── Picker ─────────────────────────────────────────────────────────────────

  const startElementPicker = useCallback(() => {
    if (!isExt()) return;
    setIsPicking(true);
    sendToTab("PIXELMORPH_START_PICK", {}, () => {});
  }, [sendToTab]);

  const cancelElementPicker = useCallback(() => {
    if (!isExt()) return;
    setIsPicking(false);
    sendToTab("PIXELMORPH_CANCEL_PICK", {}, () => {});
  }, [sendToTab]);

  // ── Standard state actions ─────────────────────────────────────────────────

  const updateColorToken = useCallback((id: string, hex: string) => {
    setColorTokens(prev => prev.map(t => t.id === id ? { ...t, hex } : t));
    setChangesCount(c => c + 1);
  }, []);

  const addColorToken = useCallback(() => {
    setColorTokens(prev => [...prev, { id: Date.now().toString(), label: "New Color", hex: "#888888" }]);
    setChangesCount(c => c + 1);
  }, []);

  const setActiveFont    = useCallback((id: string)  => { setActiveFontId(id); setChangesCount(c => c + 1); }, []);
  const setBorderRadius  = useCallback((v: number)   => { setBorderRadiusRaw(v); setChangesCount(c => c + 1); }, []);
  const setPaddingScale  = useCallback((v: number)   => { setPaddingScaleRaw(v); setChangesCount(c => c + 1); }, []);
  const setFontScale     = useCallback((v: number)   => { setFontScaleRaw(v);    setChangesCount(c => c + 1); }, []);
  const setEnabled       = useCallback((v: boolean)  => setEnabledState(v), []);

  const addTextOverride = useCallback((override: Omit<TextOverride, "id">) => {
    setTextOverrides(prev => [...prev, { ...override, id: Date.now().toString() }]);
    setChangesCount(c => c + 1);
  }, []);

  const removeTextOverride = useCallback((id: string) => setTextOverrides(prev => prev.filter(o => o.id !== id)), []);
  const updateTextOverride = useCallback((id: string, replacement: string) => {
    setTextOverrides(prev => prev.map(o => o.id === id ? { ...o, replacement } : o));
    setChangesCount(c => c + 1);
  }, []);
  const setActivePreset    = useCallback((id: string) => setActivePresetId(id), []);

  const savePreset = useCallback(() => {
    const id = `preset-${Date.now()}`;
    setPresets(prev => [...prev, { id, name: `Custom ${prev.length + 1}`, swatches: colorTokens.slice(0, 3).map(t => t.hex), modCount: changesCount }]);
    setActivePresetId(id);
  }, [colorTokens, changesCount]);

  const undo = useCallback(() => setChangesCount(c => Math.max(0, c - 1)), []);

  const value: ContextValue = {
    isEnabled, activeTab, selectedElement, selectedElementInfo, isPicking, isCapturing, isScanning, captureError,
    domTree, selectedNodeId, nodeChanges, boxCaptures,
    colorTokens, fontRoles, activeFontId, borderRadius, paddingScale, fontScale,
    textOverrides, brandFind, brandReplace,
    assets: [] as any,
    presets, activePresetId, currentSite, changesCount,
    capturedImages, capturedBackgrounds,
    setEnabled, setActiveTab, setSelectedElement, startElementPicker, cancelElementPicker,
    scanDOM, selectNode, applyNodeChange, undoAll, startBoxSelect, clearBoxCapture, reorderBoxCaptures,
    captureColors, captureText, captureResources,
    resetColors, resetText, resetResources,
    updateColorToken, addColorToken, setActiveFont,
    setBorderRadius, setPaddingScale, setFontScale,
    addTextOverride, removeTextOverride, updateTextOverride, setBrandFind, setBrandReplace,
    setActivePreset, savePreset, undo, applyChanges,
  };

  return <PixelMorphContext.Provider value={value}>{children}</PixelMorphContext.Provider>;
}

export function usePixelMorph() {
  const ctx = useContext(PixelMorphContext);
  if (!ctx) throw new Error("usePixelMorph must be used within PixelMorphProvider");
  return ctx;
}

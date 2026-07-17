export type TabId = "dom" | "colors" | "text" | "resources";

export interface ColorToken {
  id: string;
  label: string;
  hex: string;
}

export interface FontRole {
  id: string;
  family: string;
  role: string;
  roleLabel: string;
}

export interface TextOverride {
  id: string;
  selector: string;
  original: string;
  replacement: string;
}

export interface AssetItem {
  id: string;
  name: string;
  type: "img" | "bg";
  context: string;
  dimensions: string;
  src?: string;
  gradient?: string;
}

export interface Preset {
  id: string;
  name: string;
  swatches: string[];
  modCount: number;
}

export interface ElementInfo {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  selector: string;
  dimensions: { width: number; height: number };
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    borderRadius: string;
    padding: string;
  };
}

export interface DOMNode {
  id: number;
  tag: string;
  elId: string | null;
  classes: string[];
  text: string | null;
  path?: string;
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontFamily: string;
    fontWeight: string;
    borderRadius: string;
  };
  rect: { width: number; height: number };
  children: DOMNode[];
}

export interface NodeChange {
  text?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontWeight?: string;
}

export interface CapturedImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  context: string;
}

export interface CapturedBackground {
  id: string;
  src: string;
  context: string;
}

export interface PixelMorphState {
  isAILoading: boolean;
  aiError: string | null;
  aiScreenshot: string | null;
  isEnabled: boolean;
  activeTab: TabId;
  selectedElement: string | null;
  selectedElementInfo: ElementInfo | null;
  isPicking: boolean;
  isCapturing: boolean;
  isScanning: boolean;
  captureError: string | null;
  capturedImages: CapturedImage[];
  capturedBackgrounds: CapturedBackground[];
  domTree: DOMNode | null;
  selectedNodeId: number | null;
  nodeChanges: Record<number, NodeChange>;
  boxCaptures: DOMNode[][];
  colorTokens: ColorToken[];
  fontRoles: FontRole[];
  activeFontId: string;
  borderRadius: number;
  paddingScale: number;
  fontScale: number;
  textOverrides: TextOverride[];
  brandFind: string;
  brandReplace: string;
  assets: AssetItem[];
  presets: Preset[];
  activePresetId: string | null;
  currentSite: string;
  changesCount: number;
}

export interface PixelMorphActions {
  aiRedesign: () => Promise<void>;
  setEnabled: (v: boolean) => void;
  setActiveTab: (tab: TabId) => void;
  setSelectedElement: (sel: string | null) => void;
  startElementPicker: () => void;
  cancelElementPicker: () => void;
  captureColors: () => void;
  captureText: () => void;
  captureResources: () => void;
  resetColors: () => void;
  resetText: () => void;
  resetResources: () => void;
  scanDOM: () => void;
  selectNode: (id: number | null) => void;
  applyNodeChange: (id: number, changes: NodeChange) => void;
  undoAll: () => void;
  startBoxSelect: () => void;
  clearBoxCapture: (index: number) => void;
  reorderBoxCaptures: (from: number, to: number) => void;
  updateColorToken: (id: string, hex: string) => void;
  addColorToken: () => void;
  setActiveFont: (id: string) => void;
  setBorderRadius: (v: number) => void;
  setPaddingScale: (v: number) => void;
  setFontScale: (v: number) => void;
  addTextOverride: (override: Omit<TextOverride, "id">) => void;
  removeTextOverride: (id: string) => void;
  updateTextOverride: (id: string, replacement: string) => void;
  setBrandFind: (v: string) => void;
  setBrandReplace: (v: string) => void;
  setActivePreset: (id: string) => void;
  savePreset: () => void;
  undo: () => void;
  applyChanges: () => void;
}

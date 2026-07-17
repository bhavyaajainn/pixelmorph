// PixelMorph Content Script
if (window.__pixelMorphRegistered) {
  // Already running — just re-apply saved state if present
  chrome.storage.local.get(["pixelmorph_state"], (r) => {
    if (r.pixelmorph_state && window.__pixelMorphApply) window.__pixelMorphApply(r.pixelmorph_state);
  });
}

(function () {
  // Guard: manifest, background, and popup all inject this script — only let
  // the first execution register listeners and state. Subsequent injections
  // just re-apply saved state (handled by the guard above).
  if (window.__pixelMorphRegistered) return;
  window.__pixelMorphRegistered = true;
  const STYLE_ID  = "pixelmorph-styles";
  const CUSTOM_ID = "pixelmorph-custom";
  const OVERLAY_ID = "pixelmorph-overlay";
  let currentState = null;
  let hoveredEl = null;

  // ── Element registry ─────────────────────────────────────────────────────────
  // Direct DOM references keyed by pmId. This is the most reliable strategy:
  // no CSS query parsing, no text matching, no ambiguity.
  let _pmGlobalId = 0;          // monotonic counter — never resets, so captures don't collide
  const _pmElementMap = new Map(); // pmId → Element

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function rgbToHex(rgb) {
    if (!rgb) return null;
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (alpha < 0.15) return null; // skip near-transparent
    return "#" + [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, "0"))
      .join("").toUpperCase();
  }

  function cs(selector) {
    try { return window.getComputedStyle(document.querySelector(selector)); } catch (_) { return null; }
  }

  function colorOf(selector, prop) {
    const s = cs(selector);
    return s ? rgbToHex(s[prop]) : null;
  }

  function fontOf(selector) {
    const s = cs(selector);
    if (!s) return null;
    return s.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
  }

  function getSelector(el) {
    if (el.id) return `#${el.id}`;
    const cls = Array.from(el.classList).slice(0, 2).join(".");
    return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
  }

  // ── Apply styles ─────────────────────────────────────────────────────────────

  function applyStyles(state) {
    currentState = state;
    let el = document.getElementById(STYLE_ID);
    if (!el) { el = document.createElement("style"); el.id = STYLE_ID; document.head.appendChild(el); }

    if (!state.isEnabled) {
      el.textContent = "";
      const c = document.getElementById(CUSTOM_ID); if (c) c.textContent = "";
      return;
    }

    const {
      colorTokens = [], borderRadius = 8, fontScale = 100,
      textOverrides = [], brandFind = "", brandReplace = "",
      customCSS = "",
    } = state;

    // Look up by label so order doesn't matter
    function byLabel(...keys) {
      const k = keys.map(s => s.toLowerCase());
      const t = colorTokens.find(t => t.label && k.some(key => t.label.toLowerCase().includes(key)));
      return t?.hex || null;
    }
    const primary = byLabel("primary", "brand", "action");
    const bg      = byLabel("background", "bg", "surface");
    const text    = byLabel("text", "foreground", "body", "content");
    const accent  = byLabel("accent", "link", "secondary");
    const heading = byLabel("heading", "title", "head");

    let css = "";

    // ── 1. Override CSS custom properties used by the page ─────────────────
    css += ":root {\n";
    if (primary) css += [
      "--primary","--brand","--brand-color","--color-primary","--color-brand",
      "--clr-primary","--theme-primary","--accent-primary",
    ].map(v => `  ${v}: ${primary} !important;`).join("\n") + "\n";

    if (bg) css += [
      "--background","--bg","--bg-color","--background-color","--color-background",
      "--color-bg","--page-bg","--surface","--color-surface",
    ].map(v => `  ${v}: ${bg} !important;`).join("\n") + "\n";

    if (text) css += [
      "--text","--text-color","--color-text","--foreground",
      "--font-color","--body-color","--content-color",
    ].map(v => `  ${v}: ${text} !important;`).join("\n") + "\n";

    if (accent) css += [
      "--accent","--accent-color","--color-accent","--link-color",
      "--color-link","--secondary","--color-secondary",
    ].map(v => `  ${v}: ${accent} !important;`).join("\n") + "\n";
    css += "}\n";

    // ── 2. Direct element overrides ────────────────────────────────────────
    if (bg)   css += `html, body { background-color: ${bg} !important; }\n`;
    if (text) css += `body, p, span, li, td, th, blockquote { color: ${text} !important; }\n`;
    const hColor = heading || text;
    if (hColor) css += `h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"] { color: ${hColor} !important; }\n`;
    if (accent) css += `a, [class*="link"] { color: ${accent} !important; }\n`;
    if (primary) {
      css += `button[class*="primary"], [class*="btn-primary"], [class*="button--primary"],`
           + `[class*="cta"], [class*="CTA"], input[type="submit"]`
           + ` { background-color: ${primary} !important; border-color: ${primary} !important; }\n`;
    }

    // ── 3. Font scale ──────────────────────────────────────────────────────
    if (fontScale !== 100) css += `html { font-size: ${fontScale}% !important; }\n`;

    // ── 4. Border radius ───────────────────────────────────────────────────
    css += `button, input, select, textarea, [class*="btn"], [class*="card"],`
         + `[class*="badge"], [class*="chip"], [class*="tag"], [class*="pill"]`
         + ` { border-radius: ${borderRadius}px !important; }\n`;

    el.textContent = css;

    // Inject AI-generated animations / effects into a separate tag
    let customEl = document.getElementById(CUSTOM_ID);
    if (!customEl) { customEl = document.createElement("style"); customEl.id = CUSTOM_ID; document.head.appendChild(customEl); }
    customEl.textContent = customCSS || "";

    applyTextOverrides(textOverrides);
    if (brandFind && brandReplace && brandFind !== brandReplace) applyBrandReplace(brandFind, brandReplace);
  }

  function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  function applyTextOverrides(overrides) {
    overrides.forEach(({ selector, original, replacement }) => {
      if (!replacement || !original || replacement === original) return;

      const orig = norm(original);
      let replaced = 0;

      function tryEl(el) {
        const elText = norm(el.textContent);
        if (!elText.includes(orig)) return;

        // Walk individual text nodes (preserves child elements)
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const v = node.nodeValue || "";
          if (norm(v).includes(orig)) {
            node.nodeValue = v.replace(original, replacement);
            replaced++;
          }
        }

        // Fallback: text spans multiple child nodes — replace the whole element text
        if (replaced === 0 && (elText === orig || elText.includes(orig))) {
          el.textContent = el.textContent.replace(original, replacement);
          replaced++;
        }
      }

      // 1. Try captured selector
      if (selector) {
        try { document.querySelectorAll(selector).forEach(tryEl); } catch (_) {}
      }

      // 2. Try common semantic elements across the whole page
      if (replaced === 0) {
        document.querySelectorAll(
          "h1,h2,h3,h4,h5,h6,button,a,p,li,label,span,td,th,caption,figcaption,dt,dd"
        ).forEach(tryEl);
      }

      // 3. Last resort: raw text-node walk
      if (replaced === 0) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes(original)) {
            node.nodeValue = node.nodeValue.replaceAll(original, replacement);
          }
        }
      }
    });
  }

  function applyBrandReplace(find, replace) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { if (n.textContent.includes(find)) n.textContent = n.textContent.replaceAll(find, replace); });
  }

  // ── Capture: Colors ──────────────────────────────────────────────────────────

  function captureColors() {
    const seen = new Set();
    const colors = [];

    function addColor(label, hex) {
      if (!hex || seen.has(hex)) return;
      seen.add(hex);
      colors.push({ label, hex });
    }

    // Background — from body, then prominent wrappers
    const bgCandidates = ["body", "main", "[class*='hero']", "[class*='header']", "header"];
    for (const sel of bgCandidates) {
      const c = colorOf(sel, "backgroundColor");
      if (c) { addColor("Background", c); break; }
    }

    // Text — from body / paragraphs
    const textCandidates = ["body", "p", "article", "main"];
    for (const sel of textCandidates) {
      const c = colorOf(sel, "color");
      if (c) { addColor("Text", c); break; }
    }

    // Primary — from buttons and CTAs
    const primaryBg = [
      "button[type='submit']", "input[type='submit']",
      "[class*='btn-primary']", "[class*='button--primary']",
      "[class*='cta']", "button.primary", ".primary", "button",
    ];
    for (const sel of primaryBg) {
      const c = colorOf(sel, "backgroundColor");
      if (c) { addColor("Primary", c); break; }
    }

    // Primary text on button
    const primaryTextCandidates = [
      "button[type='submit']", "[class*='btn-primary']", "button.primary", "button",
    ];
    for (const sel of primaryTextCandidates) {
      const c = colorOf(sel, "color");
      if (c) { addColor("Button Text", c); break; }
    }

    // Accent — from links
    const accentCandidates = ["a", "[class*='link']", "nav a", "[class*='accent']"];
    for (const sel of accentCandidates) {
      const c = colorOf(sel, "color");
      if (c) { addColor("Accent", c); break; }
    }

    // Heading color
    const headingCandidates = ["h1", "h2", "[class*='title']", "[class*='heading']"];
    for (const sel of headingCandidates) {
      const c = colorOf(sel, "color");
      if (c) { addColor("Heading", c); break; }
    }

    // Surface / card background
    const surfaceCandidates = [
      "[class*='card']", "[class*='panel']", "section", "[class*='container']",
    ];
    for (const sel of surfaceCandidates) {
      const c = colorOf(sel, "backgroundColor");
      if (c) { addColor("Surface", c); break; }
    }

    // Border color
    const borderCandidates = ["input", "[class*='card']", "[class*='border']"];
    for (const sel of borderCandidates) {
      const c = colorOf(sel, "borderColor");
      if (c) { addColor("Border", c); break; }
    }

    // ── Fonts ────────────────────────────────────────────────────────────────
    const seenFonts = new Set();
    const fonts = [];

    function addFont(id, family, role, roleLabel) {
      if (!family || family === "inherit" || family === "initial" || seenFonts.has(family)) return;
      seenFonts.add(family);
      fonts.push({ id, family, role, roleLabel });
    }

    addFont("heading", fontOf("h1") || fontOf("h2"), "headings", "display · headings");
    addFont("body", fontOf("p") || fontOf("body"), "body", "body · paragraphs");
    addFont("mono", fontOf("code") || fontOf("pre"), "mono", "code · mono");

    // ── Text content ─────────────────────────────────────────────────────────
    const seenText = new Set();
    const textItems = [];

    function addText(el, context) {
      if (!el) return;
      const text = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (!text || text.length < 2 || text.length > 200 || seenText.has(text)) return;
      seenText.add(text);
      textItems.push({ selector: getSelector(el), text, context });
    }

    document.querySelectorAll("h1").forEach(el => addText(el, "H1 Heading"));
    document.querySelectorAll("h2").forEach(el => addText(el, "H2 Heading"));
    document.querySelectorAll("h3").forEach(el => addText(el, "H3 Heading"));
    document.querySelectorAll("button, input[type='submit'], input[type='button']").forEach(el => addText(el, "Button"));
    document.querySelectorAll("nav a, [class*='nav'] a, header a").forEach(el => addText(el, "Nav Link"));
    document.querySelectorAll("[class*='cta'], [class*='hero'] p, [class*='subtitle'], [class*='tagline']").forEach(el => addText(el, "Hero Text"));
    document.querySelectorAll("p").forEach((el, i) => { if (i < 3) addText(el, "Paragraph"); });

    return {
      colors: colors.slice(0, 8),
      fonts: fonts.filter(f => f.family),
    };
  }

  // ── Capture: Text ────────────────────────────────────────────────────────────

  function captureText() {
    const seenText = new Set();
    const textItems = [];

    function addText(el, context) {
      if (!el) return;
      const text = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (!text || text.length < 2 || text.length > 200 || seenText.has(text)) return;
      seenText.add(text);
      textItems.push({ selector: getSelector(el), text, context });
    }

    document.querySelectorAll("h1").forEach(el => addText(el, "H1 Heading"));
    document.querySelectorAll("h2").forEach(el => addText(el, "H2 Heading"));
    document.querySelectorAll("h3").forEach(el => addText(el, "H3 Heading"));
    document.querySelectorAll("button, input[type='submit'], input[type='button']").forEach(el => addText(el, "Button"));
    document.querySelectorAll("nav a, [class*='nav'] a, header a").forEach(el => addText(el, "Nav Link"));
    document.querySelectorAll("[class*='cta'], [class*='subtitle'], [class*='tagline'], [class*='hero'] p").forEach(el => addText(el, "Hero Text"));
    document.querySelectorAll("label").forEach(el => addText(el, "Label"));
    document.querySelectorAll("p").forEach((el, i) => { if (i < 5) addText(el, "Paragraph"); });

    return { textItems: textItems.slice(0, 25) };
  }

  // ── Capture: Resources (images + backgrounds) ─────────────────────────────────

  function captureResources() {
    const seenSrc = new Set();
    const images = [];
    const backgrounds = [];

    document.querySelectorAll("img").forEach(img => {
      const src = img.src || img.getAttribute("src") || "";
      if (!src || src.startsWith("data:") || seenSrc.has(src)) return;
      seenSrc.add(src);
      images.push({
        id: src,
        src,
        alt: img.alt || img.title || "",
        width: img.naturalWidth || img.offsetWidth || 0,
        height: img.naturalHeight || img.offsetHeight || 0,
        context: getSelector(img.closest("section, header, main, nav, footer, article") || img.parentElement || img),
      });
    });

    document.querySelectorAll("*").forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none" || !bg.includes("url(")) return;
      const match = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (!match || !match[1] || match[1].startsWith("data:") || seenSrc.has(match[1])) return;
      seenSrc.add(match[1]);
      backgrounds.push({ id: match[1], src: match[1], context: getSelector(el) });
    });

    return {
      images: images.slice(0, 12),
      backgrounds: backgrounds.slice(0, 8),
    };
  }

  // ── Stable CSS path ──────────────────────────────────────────────────────────
  // Generates a precise selector path rooted at the nearest ancestor with an id,
  // or all the way to body. Used as the primary element locator on apply.

  function getElementPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      if (cur.id) {
        try {
          // id must be a valid selector character sequence
          parts.unshift(`#${CSS.escape(cur.id)}`);
        } catch (_) {
          parts.unshift(`[id="${cur.id}"]`);
        }
        break; // id is unique — no need to go further up
      }
      const parent = cur.parentElement;
      if (!parent) break;
      const tag = cur.tagName.toLowerCase();
      const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
      const nth = siblings.indexOf(cur) + 1;
      parts.unshift(siblings.length === 1 ? tag : `${tag}:nth-of-type(${nth})`);
      cur = parent;
    }
    return parts.join(" > ");
  }

  // ── DOM Scanner ──────────────────────────────────────────────────────────────

  const SKIP_TAGS = new Set(["script","style","noscript","head","meta","link","template","iframe","svg","path","g"]);

  function scanDOM() {
    document.querySelectorAll("[data-pm-id]").forEach(el => el.removeAttribute("data-pm-id"));

    let count = 0;
    const MAX = 500;

    function serialize(el, depth) {
      if (depth > 8 || count >= MAX) return null;
      const tag = el.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) return null;

      const s = window.getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return null;

      const rect = el.getBoundingClientRect();
      if (rect.width < 2 && rect.height < 2) return null;

      const id = _pmGlobalId++;
      count++;
      _pmElementMap.set(id, el);
      el.setAttribute("data-pm-id", String(id));

      // Direct text content (excluding child-element text)
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.nodeValue.trim())
        .join(" ").trim().replace(/\s+/g, " ").slice(0, 120) || null;

      // Leaf text (element has no child elements)
      const leafText = el.childElementCount === 0
        ? (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) || null
        : null;

      const children = Array.from(el.children)
        .map(c => serialize(c, depth + 1))
        .filter(Boolean);

      return {
        id, tag,
        elId: el.id || null,
        classes: Array.from(el.classList).slice(0, 5),
        text: leafText || directText,
        path: getElementPath(el),
        styles: {
          backgroundColor: s.backgroundColor,
          color: s.color,
          fontSize: s.fontSize,
          fontFamily: s.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
          fontWeight: s.fontWeight,
          borderRadius: s.borderRadius,
        },
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        children,
      };
    }

    return { tree: serialize(document.body, 0), title: document.title, url: window.location.hostname };
  }

  // ── Apply change to a specific DOM node by its pm-id ─────────────────────────

  // CSS camelCase → kebab-case for setProperty
  function toKebab(prop) {
    return prop.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`);
  }

  function findElement(pmId, locator) {
    // 1. Direct DOM reference (set at capture time) — most reliable, no string matching
    const cached = _pmElementMap.get(pmId);
    if (cached && document.contains(cached)) return cached;

    // 2. Stable CSS path generated at capture time
    if (locator?.path) {
      try {
        const el = document.querySelector(locator.path);
        if (el) return el;
      } catch (_) {}
    }

    // 3. data-pm-id attribute
    const byAttr = document.querySelector(`[data-pm-id="${pmId}"]`);
    if (byAttr) return byAttr;

    // 4. Metadata fallback: HTML id → class+tag → text match
    if (locator) {
      const { tag, elId, classes, text } = locator;
      if (elId) { const el = document.getElementById(elId); if (el) return el; }
      if (classes?.length > 0) {
        try {
          const hits = Array.from(document.querySelectorAll(`${tag}.${classes[0]}`));
          if (hits.length === 1) return hits[0];
          if (hits.length > 1 && text) {
            const match = hits.find(h => (h.textContent || "").trim().startsWith(text.slice(0, 30)));
            if (match) return match;
          }
        } catch (_) {}
      }
      if (text && text.length > 3) {
        const candidates = Array.from(document.querySelectorAll(tag));
        const match = candidates.find(c => (c.textContent || "").trim().startsWith(text.slice(0, 40)));
        if (match) return match;
      }
    }

    return null;
  }

  // Heritable CSS props cascade to children — for these we wrap direct text
  // nodes in a <span> so the style only touches the visible text, not every
  // child element on the page.
  const HERITABLE = new Set(["color", "fontSize", "fontWeight", "fontFamily"]);

  function applyHeritable(el, cssProp, value) {
    if (el.childElementCount === 0) {
      // Leaf element — safe to style directly, nothing will inherit
      el.style.setProperty(cssProp, value, "important");
      return;
    }

    // Non-leaf: wrap each direct text node in a pm-scoped span.
    // Child elements keep their own CSS — no unwanted inheritance.
    const textNodes = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());

    if (textNodes.length === 0) {
      // No direct text — fall back to setting on the element itself
      el.style.setProperty(cssProp, value, "important");
      return;
    }

    textNodes.forEach(textNode => {
      // Re-use an existing pm wrapper on the same text node
      const prev = textNode.previousSibling;
      if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.getAttribute("data-pm-wrap") === "1") {
        prev.appendChild(textNode);
        prev.style.setProperty(cssProp, value, "important");
        return;
      }
      const span = document.createElement("span");
      span.setAttribute("data-pm-wrap", "1");
      span.style.setProperty(cssProp, value, "important");
      el.insertBefore(span, textNode);
      span.appendChild(textNode);
    });
  }

  function applyNodeChange(pmId, changes, locator) {
    const el = findElement(pmId, locator);
    if (!el) return false;

    // Re-tag for future fast lookups
    el.setAttribute("data-pm-id", String(pmId));

    // ── Text ──────────────────────────────────────────────────────────────
    if (changes.text !== undefined && changes.text !== null) {
      // Unwrap pm spans first so we set plain text, then re-apply styles
      el.querySelectorAll("[data-pm-wrap]").forEach(span => {
        while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
        span.remove();
      });
      if (el.childElementCount === 0) {
        el.textContent = changes.text;
      } else {
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
            node.nodeValue = changes.text;
            break;
          }
        }
      }
    }

    // ── CSS ───────────────────────────────────────────────────────────────
    const NON_HERITABLE = ["backgroundColor", "borderRadius", "padding"];
    NON_HERITABLE.forEach(prop => {
      if (changes[prop] !== undefined)
        el.style.setProperty(toKebab(prop), changes[prop], "important");
    });

    HERITABLE.forEach(prop => {
      if (changes[prop] !== undefined)
        applyHeritable(el, toKebab(prop), changes[prop]);
    });

    return true;
  }

  // ── Highlight a DOM node ──────────────────────────────────────────────────────

  let _hlEl = null;
  let _hlPrev = "";

  function highlightNode(pmId, locator) {
    if (_hlEl) { _hlEl.style.outline = _hlPrev; _hlEl = null; }
    if (pmId === null || pmId === undefined) return;
    const el = findElement(pmId, locator);
    if (!el) return;
    _hlPrev = el.style.outline || "";
    _hlEl = el;
    el.style.outline = "2px solid #7B61FF";
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Page info (full-page selection) ─────────────────────────────────────────

  function pageInfo() {
    const s = window.getComputedStyle(document.body);
    return {
      tag: "body",
      id: null,
      classes: [],
      text: document.title,
      selector: "body (full page)",
      dimensions: { width: window.innerWidth, height: document.body.scrollHeight },
      styles: {
        backgroundColor: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        borderRadius: "0px",
        padding: "0px",
      },
    };
  }

  // ── Element info ─────────────────────────────────────────────────────────────

  function elementInfo(el) {
    const rect = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: Array.from(el.classList).slice(0, 4),
      text: (el.textContent || "").trim().slice(0, 80),
      selector: getSelector(el),
      dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
      styles: {
        backgroundColor: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        borderRadius: s.borderRadius,
        padding: s.padding,
      },
    };
  }

  // ── Reset a node (undo) ───────────────────────────────────────────────────────

  const STYLE_PROPS = ["color","backgroundColor","fontSize","fontWeight","borderRadius","fontFamily","padding","margin"];

  function resetNodeChange(pmId, originalText, locator) {
    const el = findElement(pmId, locator);
    if (!el) return false;

    // Unwrap any scoped text-node wrappers we injected
    el.querySelectorAll("[data-pm-wrap]").forEach(span => {
      while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
      span.remove();
    });

    // Remove PixelMorph inline styles (removeProperty also clears !important)
    STYLE_PROPS.forEach(p => { el.style.removeProperty(toKebab(p)); });

    // Restore original text
    if (originalText !== null && originalText !== undefined) {
      if (el.childElementCount === 0) {
        el.textContent = originalText;
      } else {
        for (const n of el.childNodes) {
          if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()) { n.nodeValue = originalText; break; }
        }
      }
    }
    return true;
  }

  // ── Box capture ───────────────────────────────────────────────────────────────

  let _boxActive = false;
  let _boxStart = null;
  let _boxEl = null;
  let _boxUi = null;
  let _boxNodes = null; // locally cached until popup pulls it

  function serializeInRect(rect) {
    const boxL = rect.x, boxR = rect.x + rect.w;
    const boxT = rect.y, boxB = rect.y + rect.h;
    const boxArea = rect.w * rect.h;

    const SKIP = new Set(["script","style","noscript","svg","path","g","head","meta","link","template","iframe"]);
    const results = [];
    const seen = new Set();

    document.querySelectorAll("*").forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (SKIP.has(tag) || seen.has(el)) return;

      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;

      // Compute actual geometric overlap between element and drawn box
      const oL = Math.max(r.left, boxL), oR = Math.min(r.right, boxR);
      const oT = Math.max(r.top,  boxT), oB = Math.min(r.bottom, boxB);
      if (oR <= oL || oB <= oT) return; // no overlap at all

      const overlapArea = (oR - oL) * (oB - oT);
      const elArea = r.width * r.height;

      // Include when ≥25% of the element is inside the box, OR the element
      // covers a big chunk of the box itself (catches small boxes over large cards)
      const elCoverage  = overlapArea / elArea;
      const boxCoverage = overlapArea / boxArea;
      if (elCoverage < 0.25 && boxCoverage < 0.25) return;

      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;

      // Extract text: leaf text preferred, then direct text nodes
      const leafText = el.childElementCount === 0
        ? (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 150) || null
        : null;
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())
        .map(n => n.nodeValue.trim()).join(" ").slice(0, 150) || null;
      const text = leafText || directText;

      const bg  = cs.backgroundColor;
      const clr = cs.color;
      const hasBg  = bg  && bg  !== "rgba(0, 0, 0, 0)" && bg  !== "transparent";
      const hasClr = clr && clr !== "rgba(0, 0, 0, 0)" && clr !== "transparent";

      if (!text && !hasBg && !hasClr) return;

      seen.add(el);
      const id = _pmGlobalId++;
      _pmElementMap.set(id, el);
      el.setAttribute("data-pm-id", String(id));

      results.push({
        id, tag,
        elId: el.id || null,
        classes: Array.from(el.classList).slice(0, 5),
        text,
        path: getElementPath(el),
        styles: {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
          fontWeight: cs.fontWeight,
          borderRadius: cs.borderRadius,
        },
        rect: { width: Math.round(r.width), height: Math.round(r.height) },
        children: [],
      });
    });

    return results;
  }

  function showBoxButtons(bx, by, bw, bh, onOk) {
    _boxUi = document.createElement("div");
    const btnX = Math.max(8, bx + bw/2 - 70);
    const btnY = Math.min(window.innerHeight - 60, by + bh + 10);
    _boxUi.style.cssText = `position:fixed;left:${btnX}px;top:${btnY}px;display:flex;gap:8px;z-index:2147483647;font-family:sans-serif;`;

    const ok = document.createElement("button");
    ok.textContent = "✓  OK";
    ok.style.cssText = "padding:8px 20px;background:#7B61FF;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.4);";
    ok.onclick = e => { e.stopPropagation(); onOk(); cancelBoxSelect(); };

    const cancel = document.createElement("button");
    cancel.textContent = "✗";
    cancel.style.cssText = "padding:8px 14px;background:rgba(0,0,0,0.8);color:#aaa;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;font-size:13px;";
    cancel.onclick = e => { e.stopPropagation(); cancelBoxSelect(); chrome.runtime.sendMessage({type:"PIXELMORPH_BOX_CANCELLED"}); };

    _boxUi.appendChild(ok);
    _boxUi.appendChild(cancel);
    document.documentElement.appendChild(_boxUi);
  }

  function onBoxDown(e) {
    if (!_boxActive) return;
    e.preventDefault(); e.stopPropagation();
    _boxStart = { x: e.clientX, y: e.clientY };
    _boxEl = document.createElement("div");
    _boxEl.style.cssText = "position:fixed;border:2px solid #7B61FF;background:rgba(123,97,255,0.1);pointer-events:none;z-index:2147483646;box-shadow:0 0 0 2000px rgba(0,0,0,0.25);";
    document.documentElement.appendChild(_boxEl);
    document.addEventListener("mousemove", onBoxMove, true);
    document.addEventListener("mouseup", onBoxUp, true);
  }

  function onBoxMove(e) {
    if (!_boxStart || !_boxEl) return;
    const x = Math.min(e.clientX, _boxStart.x), y = Math.min(e.clientY, _boxStart.y);
    const w = Math.abs(e.clientX - _boxStart.x), h = Math.abs(e.clientY - _boxStart.y);
    Object.assign(_boxEl.style, { left:x+"px", top:y+"px", width:w+"px", height:h+"px" });
  }

  function onBoxUp(e) {
    if (!_boxStart || !_boxEl) return;
    document.removeEventListener("mousemove", onBoxMove, true);
    document.removeEventListener("mouseup", onBoxUp, true);
    const x = Math.min(e.clientX, _boxStart.x), y = Math.min(e.clientY, _boxStart.y);
    const w = Math.abs(e.clientX - _boxStart.x), h = Math.abs(e.clientY - _boxStart.y);
    if (w < 10 || h < 10) { cancelBoxSelect(); return; }
    _boxEl.style.pointerEvents = "none";
    // Deactivate before showing buttons — otherwise onBoxDown (still registered
    // in capture phase) intercepts the mousedown on OK and swallows the click.
    _boxActive = false;
    document.removeEventListener("mousedown", onBoxDown, true);
    showBoxButtons(x, y, w, h, () => {
      _boxNodes = serializeInRect({ x, y, w, h });
      chrome.runtime.sendMessage({ type: "PIXELMORPH_BOX_DONE" }, () => {});
    });
  }

  function startBoxSelect() {
    cancelBoxSelect(); // always start from clean state
    _boxActive = true;
    // Use setProperty so page CSS with !important can't block the crosshair
    document.documentElement.style.setProperty("cursor", "crosshair", "important");
    document.addEventListener("mousedown", onBoxDown, true);
  }

  function cancelBoxSelect() {
    _boxActive = false;
    document.documentElement.style.removeProperty("cursor");
    if (_boxEl)  { _boxEl.remove();  _boxEl = null; }
    if (_boxUi)  { _boxUi.remove();  _boxUi = null; }
    _boxStart = null;
    document.removeEventListener("mousedown", onBoxDown, true);
    document.removeEventListener("mousemove", onBoxMove, true);
    document.removeEventListener("mouseup", onBoxUp, true);
  }

  // ── Element picker ───────────────────────────────────────────────────────────

  function getOverlay() {
    let ov = document.getElementById(OVERLAY_ID);
    if (!ov) {
      ov = document.createElement("div");
      ov.id = OVERLAY_ID;
      ov.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #7B61FF;background:rgba(123,97,255,0.12);border-radius:3px;transition:all 80ms ease;display:none;box-shadow:0 0 0 2px rgba(123,97,255,0.3)";
      document.documentElement.appendChild(ov);
    }
    return ov;
  }

  function removeOverlay() { document.getElementById(OVERLAY_ID)?.remove(); }

  function onMove(e) {
    const target = e.target;
    if (!target || target.id === OVERLAY_ID) return;
    hoveredEl = target;
    const rect = target.getBoundingClientRect();
    const ov = getOverlay();
    Object.assign(ov.style, {
      display: "block",
      top: rect.top + "px", left: rect.left + "px",
      width: rect.width + "px", height: rect.height + "px",
    });
  }

  function onPick(e) {
    e.preventDefault(); e.stopPropagation();
    if (hoveredEl) chrome.runtime.sendMessage({ type: "PIXELMORPH_ELEMENT_SELECTED", payload: elementInfo(hoveredEl) });
    stopPicker();
  }

  function onKey(e) {
    if (e.key === "Escape") { stopPicker(); chrome.runtime.sendMessage({ type: "PIXELMORPH_PICK_CANCELLED" }); }
  }

  function startPicker() {
    document.documentElement.style.cursor = "crosshair";
    getOverlay();
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onPick, true);
    document.addEventListener("keydown", onKey, true);
  }

  function stopPicker() {
    document.documentElement.style.cursor = "";
    removeOverlay();
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onPick, true);
    document.removeEventListener("keydown", onKey, true);
  }

  // ── Message listener ─────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === "PIXELMORPH_UPDATE")          { applyStyles(msg.payload); respond({ ok: true }); }
    if (msg.type === "PIXELMORPH_GET_STATE")        { respond({ state: currentState }); }
    if (msg.type === "PIXELMORPH_GET_PAGE_INFO")    { respond({ info: pageInfo() }); }
    if (msg.type === "PIXELMORPH_SCAN_DOM")           { respond(scanDOM()); }
  if (msg.type === "PIXELMORPH_APPLY_NODE")         { respond({ ok: applyNodeChange(msg.pmId, msg.changes, msg.locator) }); }
  if (msg.type === "PIXELMORPH_HIGHLIGHT_NODE")     { highlightNode(msg.pmId, msg.locator); respond({ ok: true }); }
  if (msg.type === "PIXELMORPH_CAPTURE_COLORS")    { respond(captureColors()); }
  if (msg.type === "PIXELMORPH_CAPTURE_TEXT")      { respond(captureText()); }
  if (msg.type === "PIXELMORPH_CAPTURE_RESOURCES") { respond(captureResources()); }
  if (msg.type === "PIXELMORPH_RESET_NODE")        { respond({ ok: resetNodeChange(msg.pmId, msg.originalText, msg.locator) }); }
  if (msg.type === "PIXELMORPH_START_BOX")         { startBoxSelect(); respond({ ok: true }); }
  if (msg.type === "PIXELMORPH_CANCEL_BOX")        { cancelBoxSelect(); respond({ ok: true }); }
  if (msg.type === "PIXELMORPH_GET_BOX_RESULT") {
    respond({ nodes: _boxNodes ?? [] });
    _boxNodes = null;
  }
    if (msg.type === "PIXELMORPH_START_PICK")       { startPicker(); respond({ ok: true }); }
    if (msg.type === "PIXELMORPH_CANCEL_PICK")      { stopPicker(); respond({ ok: true }); }
    return true;
  });

  // Expose so the guard at the top can re-apply on duplicate injection
  window.__pixelMorphApply = applyStyles;

  // Restore last saved state on page load
  chrome.storage.local.get(["pixelmorph_state"], (r) => {
    if (r.pixelmorph_state) applyStyles(r.pixelmorph_state);
  });
})();

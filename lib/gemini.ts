const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export interface AIRedesign {
  colorTokens: { label: string; hex: string }[];
  borderRadius: number;
  fontScale: number;
  customCSS?: string;
}

export async function geminiRedesign(
  apiKey: string,
  pageContext: {
    colors: { label: string; hex: string }[];
    fonts:  { role: string; family: string }[];
    site:   string;
    screenshot?: string | null;
  }
): Promise<AIRedesign> {
  const prompt = `You are a world-class UI/UX designer. Redesign this website with a cohesive, beautiful theme. READABILITY IS THE #1 PRIORITY — every piece of text must be clearly legible against its background at all times.

Site: ${pageContext.site}
Current colors: ${JSON.stringify(pageContext.colors)}
Current fonts: ${JSON.stringify(pageContext.fonts)}

Output ONLY a valid JSON object with this exact shape:
{
  "colorTokens": [
    { "label": "primary",    "hex": "#..." },
    { "label": "background", "hex": "#..." },
    { "label": "text",       "hex": "#..." },
    { "label": "accent",     "hex": "#..." }
  ],
  "borderRadius": <integer 0–24>,
  "fontScale": <integer 85–115>,
  "customCSS": "<CSS string>"
}

COLOR RULES (mandatory):
- "background" is the main page background — choose a clean, solid dark or light color (no mid-tones)
- "text" must have contrast ratio ≥ 7:1 against "background" (e.g. near-white on dark bg, near-black on light bg)
- "primary" is for buttons/highlights — must contrast well against both background and white/black text on it
- "accent" is for links and secondary highlights
- The theme must feel consistent and intentional across the whole site

For customCSS — write CSS that enhances the ENTIRE site cohesively:
- Apply background color to body, html, all major containers (header, nav, footer, main, section, article, aside, [class*="container"], [class*="wrapper"])
- Apply text color to all text elements (body, p, span, div, li, td, label, input, textarea)
- Apply primary color to all buttons, CTAs, nav active states
- Apply accent color to all links
- Add ONE subtle animated gradient shimmer to the hero/header area only (not the whole page — it kills readability)
- Add smooth hover transitions on buttons (lift + glow), links (color shift), and cards (subtle shadow)
- Do NOT use animated backgrounds on body — it makes text unreadable
- Do NOT use light text colors that blend with a light background or dark text on dark backgrounds

Use only standard CSS. Escape double quotes as \\\" inside the JSON string.`;


  const parts: object[] = [];
  if (pageContext.screenshot) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: pageContext.screenshot } });
  }
  parts.push({ text: prompt });

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Gemini error ${res.status}`);
  }

  const data = await res.json();

  const candidate   = data.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (!candidate || !candidate.content) {
    const block = data.promptFeedback?.blockReason;
    throw new Error(block ? `Blocked by Gemini safety filter: ${block}` : "Gemini returned no response.");
  }

  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was cut off — try again.");
  }

  const raw = candidate.content.parts?.[0]?.text ?? "";
  if (!raw.trim()) throw new Error("Gemini returned an empty response.");

  try {
    return JSON.parse(raw) as AIRedesign;
  } catch {
    throw new Error("Gemini returned malformed JSON — try again.");
  }
}

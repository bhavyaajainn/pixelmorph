var e=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;async function t(t,n){let r=`You are a world-class UI/UX designer. Redesign this website with a cohesive, beautiful theme. READABILITY IS THE #1 PRIORITY — every piece of text must be clearly legible against its background at all times.

Site: ${n.site}
Current colors: ${JSON.stringify(n.colors)}
Current fonts: ${JSON.stringify(n.fonts)}

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

Use only standard CSS. Escape double quotes as \\\" inside the JSON string.`,i=[];n.screenshot&&i.push({inlineData:{mimeType:`image/jpeg`,data:n.screenshot}}),i.push({text:r});let a=await fetch(`${e}?key=${t}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:i}],generationConfig:{temperature:.9,maxOutputTokens:4096,responseMimeType:`application/json`,thinkingConfig:{thinkingBudget:0}}})});if(!a.ok){let e=await a.json().catch(()=>({}));throw Error(e?.error?.message??`Gemini error ${a.status}`)}let o=await a.json(),s=o.candidates?.[0],c=s?.finishReason;if(!s||!s.content){let e=o.promptFeedback?.blockReason;throw Error(e?`Blocked by Gemini safety filter: ${e}`:`Gemini returned no response.`)}if(c===`MAX_TOKENS`)throw Error(`Gemini response was cut off — try again.`);let l=s.content.parts?.[0]?.text??``;if(!l.trim())throw Error(`Gemini returned an empty response.`);try{return JSON.parse(l)}catch{throw Error(`Gemini returned malformed JSON — try again.`)}}export{t as geminiRedesign};
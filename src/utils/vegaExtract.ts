export type VegaLiteSpec = Record<string, any>;

export type VegaExtractResult =
  | { ok: true; spec: VegaLiteSpec; raw: string; source: "fenced" | "braces" }
  | { ok: false; reason: "not_found" | "invalid_json" | "invalid_schema"; error?: string };

function isValidVegaLite(spec: any): boolean {
  if (!spec || typeof spec !== "object") return false;
  if (!("mark" in spec)) return false;
  if (!("encoding" in spec)) return false;
  if (typeof spec.encoding !== "object" || spec.encoding === null) return false;
  return true;
}

function extractFromFencedJson(text: string): string | null {
  const re = /```json\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = re.exec(text)) !== null) last = match;
  return last ? last[1] : null;
}

function extractLastJSONObjectByBraces(text: string): string | null {
  let inString = false;
  let escape = false;

  const candidates: Array<{ start: number; end: number }> = [];
  const stack: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      stack.push(i);
    } else if (ch === "}") {
      const start = stack.pop();
      if (start !== undefined && stack.length === 0) {
        candidates.push({ start, end: i + 1 });
      }
    }
  }

  if (candidates.length === 0) return null;
  const last = candidates[candidates.length - 1];
  return text.slice(last.start, last.end);
}

export function tryExtractVegaSpec(fullText: string): VegaExtractResult {
  const fenced = extractFromFencedJson(fullText);
  const raw = (fenced ?? extractLastJSONObjectByBraces(fullText))?.trim();

  if (!raw) return { ok: false, reason: "not_found" };

  try {
    const parsed = JSON.parse(raw);

    if (!isValidVegaLite(parsed)) {
      return { ok: false, reason: "invalid_schema", error: "Spec missing required fields: mark/encoding" };
    }
    return { ok: true, spec: parsed, raw, source: fenced ? "fenced" : "braces" };
  } catch (e: any) {
    return { ok: false, reason: "invalid_json", error: String(e?.message ?? e) };
  }
}

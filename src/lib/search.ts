/** Normalize Persian/Arabic text for robust search (SQLite LIKE) */
export function normalizeFa(input: string): string {
  return (input ?? "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // diacritics + tatweel
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // ۰-۹
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠-٩
    .replace(/[يﻲﻱ]/g, "ی")
    .replace(/[كﮐﮑ]/g, "ک")
    .replace(/[ۀہ]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchText(...parts: (string | null | undefined)[]): string {
  return normalizeFa(parts.filter((p) => !!p).join(" "));
}

/** Split query into AND terms (quoted phrases supported later) */
export function searchTerms(q: string): string[] {
  return normalizeFa(q).split(" ").filter((t) => t.length > 0);
}

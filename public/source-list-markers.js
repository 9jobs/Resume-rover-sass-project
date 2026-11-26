// Symbol-font bullets in PDFs can extract as private-use U+F0B7.
export function normalizeSourceListMarkers(text){return String(text||'').replace(/(^|\n)([\t ]*)[\uF0B7\u2022\u25CF\u25AA\u25E6\u2023\u2043][\t ]*/gu,'$1$2- ')}

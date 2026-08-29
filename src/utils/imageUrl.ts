export function normalizeImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  try {
    return encodeURI(trimmed);
  } catch {
    return trimmed.replace(/\s/g, "%20");
  }
}

export function cssUrl(value: string) {
  return `url("${value.replace(/["\\]/g, "\\$&")}")`;
}

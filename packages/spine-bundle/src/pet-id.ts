export function extractSpinePetId(
  fileName: string,
  fallbackName?: string,
): number {
  const fromFile =
    fileName.match(/(?:pskilltimeline_)?spines?_?(\d+)/i)?.[1] ??
    fileName.match(/ppets?_?(\d+)/i)?.[1];
  if (fromFile) return Number(fromFile);
  const fromName = fallbackName?.match(/(\d+)/)?.[1];
  return fromName ? Number(fromName) : 0;
}

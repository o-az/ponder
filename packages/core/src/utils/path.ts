export function normalizeDirectory(path: string) {
  return path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

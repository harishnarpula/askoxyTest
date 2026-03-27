export type FileItem = {
  path: string;
  content: string;
};

/**
 * Merge existing files with patched files
 * - Keeps old files
 * - Overwrites only changed files
 */
export function mergeFiles(
  oldFiles: FileItem[] = [],
  newFiles: FileItem[] = []
): FileItem[] {
  const map = new Map<string, string>();

  // 1. Add existing files
  for (const file of oldFiles) {
    if (!file?.path) continue;
    map.set(file.path, file.content);
  }

  // 2. Override with new files (PATCH)
  for (const file of newFiles) {
    if (!file?.path) continue;
    map.set(file.path, file.content);
  }

  // 3. Convert back to array
  return Array.from(map.entries()).map(([path, content]) => ({
    path,
    content,
  }));
}
import { unlink } from "node:fs/promises";

/** Remove multipart temp file if the adapter wrote one to disk. */
export async function cleanupMultipartTemp(file: {
  filepath?: string;
  file?: { destroyed?: boolean; destroy?: () => void };
}): Promise<void> {
  try {
    file.file?.destroy?.();
  } catch {
    // ignore
  }
  const path = file.filepath;
  if (!path) return;
  await unlink(path).catch(() => undefined);
}

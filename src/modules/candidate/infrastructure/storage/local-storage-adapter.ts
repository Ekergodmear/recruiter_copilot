import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { StoragePort, StoredObject } from "./storage-port.js";
import { sanitizeUploadFilename } from "../../../../shared/security/filename.js";

export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly basePath: string) {}

  async store(params: {
    workspaceId: string;
    resumeId: string;
    filename: string;
    buffer: Buffer;
  }): Promise<StoredObject> {
    const safeName = sanitizeUploadFilename(params.filename);
    const storageRef = `${params.workspaceId}/${params.resumeId}/${safeName}`;
    const path = this.resolveSafePath(storageRef);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, params.buffer);
    return { storageRef, path };
  }

  async read(storageRef: string): Promise<Buffer> {
    const path = this.resolveSafePath(storageRef);
    return readFile(path);
  }

  private resolveSafePath(storageRef: string): string {
    if (storageRef.includes("\0") || storageRef.includes("..")) {
      throw new Error("Invalid storage reference");
    }
    const full = resolve(join(this.basePath, storageRef));
    const root = resolve(this.basePath) + sep;
    if (full !== resolve(this.basePath) && !full.startsWith(root)) {
      throw new Error("Invalid storage reference");
    }
    return full;
  }
}

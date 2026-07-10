import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StoragePort, StoredObject } from "./storage-port.js";

export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly basePath: string) {}

  async store(params: {
    workspaceId: string;
    resumeId: string;
    filename: string;
    buffer: Buffer;
  }): Promise<StoredObject> {
    const storageRef = `${params.workspaceId}/${params.resumeId}/${params.filename}`;
    const path = join(this.basePath, storageRef);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, params.buffer);
    return { storageRef, path };
  }

  async read(storageRef: string): Promise<Buffer> {
    const path = join(this.basePath, storageRef);
    return readFile(path);
  }
}

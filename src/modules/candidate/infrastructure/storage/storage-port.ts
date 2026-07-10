export type StoredObject = {
  storageRef: string;
  path: string;
};

export interface StoragePort {
  store(params: {
    workspaceId: string;
    resumeId: string;
    filename: string;
    buffer: Buffer;
  }): Promise<StoredObject>;

  read(storageRef: string): Promise<Buffer>;
}

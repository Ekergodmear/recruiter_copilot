import { v4 as uuidv4 } from "uuid";

export interface IdGenerator {
  generateId(prefix: string): string;
}

export class UuidIdGenerator implements IdGenerator {
  generateId(prefix: string): string {
    return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
  }
}

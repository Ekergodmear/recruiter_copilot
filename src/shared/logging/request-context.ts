import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContextStore = {
  requestId: string;
  correlationId: string;
  candidateId?: string;
  operation?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return storage.getStore();
}

/** Bind context for the current async resource (Fastify hooks / request lifecycle). */
export function enterRequestContext(ctx: RequestContextStore): void {
  storage.enterWith(ctx);
}

export function runWithRequestContext<T>(ctx: RequestContextStore, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithRequestContextAsync<T>(
  ctx: RequestContextStore,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn);
}

export function setRequestCandidateId(candidateId: string): void {
  const store = storage.getStore();
  if (store) store.candidateId = candidateId;
}

export function setRequestOperation(operation: string): void {
  const store = storage.getStore();
  if (store) store.operation = operation;
}

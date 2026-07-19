import type { ActorRegistry } from "../../authorization/application/actor-registry.js";

const MENTION_RE = /@([a-zA-Z0-9_]+)/g;

/**
 * Deterministic @actorId extraction against Actor Registry.
 * Unknown tokens are ignored (no notification).
 */
export function extractMentionedActorIds(body: string, actors: ActorRegistry): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    const id = match[1] ?? "";
    if (id && actors.resolveRole(id)) {
      found.add(id);
    }
  }
  return [...found];
}

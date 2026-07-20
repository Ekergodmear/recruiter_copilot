import { useEffect } from "react";

type Options = {
  onFocusComposer: () => void;
  onCommandPalette: () => void;
  onEscape: () => void;
  enabled?: boolean;
};

/** Sprint 0 D8 — keyboard-first shortcuts. */
export function useAssistantKeyboard({
  onFocusComposer,
  onCommandPalette,
  onEscape,
  enabled = true,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onCommandPalette();
        return;
      }

      if (e.key === "Escape") {
        onEscape();
        return;
      }

      if (e.key === "/" && !meta && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        onFocusComposer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onFocusComposer, onCommandPalette, onEscape]);
}

import { useLayoutEffect, useRef, type RefObject } from "react";

const modalStack: HTMLElement[] = [];
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type InertState = {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
};

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
}

export function useModalFocus(
  backdropRef: RefObject<HTMLElement | null>,
  dialogRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const inertStates: InertState[] = [];
    let branch: HTMLElement = backdrop;
    let parent = branch.parentElement;
    while (parent && parent !== document.body) {
      for (const sibling of Array.from(parent.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
        inertStates.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden"),
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
      branch = parent;
      parent = branch.parentElement;
    }

    modalStack.push(dialog);
    const initialFocus = dialog.querySelector<HTMLElement>("[data-modal-initial-focus]")
      ?? getFocusableElements(dialog)[0]
      ?? dialog;
    initialFocus.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== dialog) return;

      if (event.key === "Escape" && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const initialFocusTarget = dialog.querySelector<HTMLElement>("[data-modal-initial-focus]");
      if (event.shiftKey && (
        document.activeElement === first ||
        document.activeElement === initialFocusTarget ||
        !dialog.contains(document.activeElement)
      )) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = modalStack.lastIndexOf(dialog);
      if (index >= 0) modalStack.splice(index, 1);
      for (const state of inertStates) {
        state.element.inert = state.inert;
        if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
        else state.element.setAttribute("aria-hidden", state.ariaHidden);
      }
      const wasFocusable = previouslyFocused && (
        previouslyFocused.matches(focusableSelector) ||
        previouslyFocused.hasAttribute("tabindex") ||
        previouslyFocused.isContentEditable
      );
      if (wasFocusable && previouslyFocused.isConnected && !previouslyFocused.inert) {
        previouslyFocused.focus({ preventScroll: true });
      } else {
        const parentDialog = modalStack.at(-1);
        const fallbackFocus = parentDialog?.querySelector<HTMLElement>("[data-modal-initial-focus]")
          ?? parentDialog;
        if (fallbackFocus) {
          fallbackFocus.focus({ preventScroll: true });
        } else {
          requestAnimationFrame(() => {
            document.querySelector<HTMLElement>("[data-modal-return-focus]")
              ?.focus({ preventScroll: true });
          });
        }
      }
    };
  }, [backdropRef, dialogRef]);
}

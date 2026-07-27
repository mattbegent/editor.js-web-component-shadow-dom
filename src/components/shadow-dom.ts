/**
 * Shadow DOM support utility
 *
 * Provides methods that abstract DOM operations to work both in
 * regular document context and inside a Shadow DOM.
 *
 * Note: This module maintains a global shadow root reference which is set
 * during editor initialization. For multiple editor instances in different
 * shadow roots, the shadow root is re-set before each editor's operations.
 * Since Editor.js operations are synchronous within a single tick,
 * this approach is safe for sequential initialization.
 */

/**
 * The current shadow root context for this editor instance.
 * Set during editor initialization when shadowRoot config option is provided.
 */
let currentShadowRoot: ShadowRoot | null = null;

/**
 * Set the shadow root context for this editor instance
 *
 * @param shadowRoot - ShadowRoot to use as context, or null for regular document context
 */
export function setShadowRoot(shadowRoot: ShadowRoot | null): void {
  currentShadowRoot = shadowRoot;

  if (shadowRoot) {
    patchGlobalSelectionForShadowDom();
  }
}

/**
 * Get the current shadow root context
 *
 * @returns ShadowRoot if editor is inside shadow DOM, null otherwise
 */
export function getShadowRoot(): ShadowRoot | null {
  return currentShadowRoot;
}

/**
 * Returns the root node for DOM queries.
 * If a shadow root is set, returns it; otherwise returns document.
 */
export function getRootNode(): Document | ShadowRoot {
  return currentShadowRoot || document;
}

/**
 * Get an element by ID, searching in the correct root.
 *
 * @param id - element ID to find
 * @returns HTMLElement or null
 */
export function getElementById(id: string): HTMLElement | null {
  if (currentShadowRoot) {
    return currentShadowRoot.getElementById(id);
  }

  return document.getElementById(id);
}

/**
 * Get the element at specified coordinates, respecting shadow DOM.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Element at the point or null
 */
export function elementFromPoint(x: number, y: number): Element | null {
  if (currentShadowRoot) {
    return currentShadowRoot.elementFromPoint(x, y);
  }

  return document.elementFromPoint(x, y);
}

/**
 * Returns the node where styles should be injected.
 * For shadow DOM, styles go into the shadow root.
 * For regular DOM, styles go into document.head.
 */
export function getStylesTarget(): HTMLElement | ShadowRoot {
  if (currentShadowRoot) {
    return currentShadowRoot;
  }

  return document.head;
}

/**
 * Returns the selection, taking shadow DOM into account.
 * In shadow DOM, we need to use the shadow root's getSelection() if available,
 * or fall back to document.getSelection().
 *
 * Note: In Chrome 120+ and Safari 16.4+, shadowRoot.getSelection() is supported.
 * In older browsers, document.getSelection() still works for shadow DOM content.
 *
 * @returns Selection or null
 */
export function getSelection(): Selection | null {
  if (currentShadowRoot) {
    /**
     * In modern browsers with shadow DOM support, shadowRoot.getSelection()
     * returns the actual selection inside the shadow tree.
     * document.getSelection() retargets anchorNode/focusNode to the shadow host,
     * making range operations fail.
     *
     * Important: We must query the shadow root that actually contains the active element,
     * not just `currentShadowRoot`, because with multiple editors the global may point
     * to a different shadow root.
     */
    const activeShadowRoot = getFocusedShadowRoot() || currentShadowRoot;

    if (activeShadowRoot && typeof (activeShadowRoot as any).getSelection === 'function') {
      return (activeShadowRoot as any).getSelection();
    }

    return document.getSelection();
  }

  return window.getSelection();
}

/**
 * Find the deepest shadow root that contains the currently focused element.
 * Traverses the activeElement chain through nested shadow roots.
 *
 * @returns the deepest focused ShadowRoot, or null if focus is not inside a shadow tree
 */
function getFocusedShadowRoot(): ShadowRoot | null {
  let el = document.activeElement;
  let deepestShadowRoot: ShadowRoot | null = null;

  while (el && el.shadowRoot) {
    deepestShadowRoot = el.shadowRoot;

    const inner = el.shadowRoot.activeElement;

    if (!inner) {
      break;
    }

    el = inner;
  }

  return deepestShadowRoot;
}

/**
 * Whether the global Selection API (window.getSelection / document.getSelection)
 * has already been patched for shadow DOM support.
 */
let isGlobalSelectionPatched = false;

/**
 * Patches the global `window.getSelection` and `Document.prototype.getSelection`
 * so that third-party tools (which are not aware of Editor.js's shadow DOM support
 * and call the native Selection API directly) still get a Selection whose
 * anchorNode/focusNode point at the real focused node instead of being retargeted
 * to the shadow host.
 *
 * Without this, tools like @editorjs/list read `window.getSelection().anchorNode`
 * to find the current list item; inside a Shadow DOM that node gets retargeted to
 * the shadow host element, so the lookup fails silently (e.g. Enter does nothing).
 *
 * This is applied once per page, the first time an editor is initialized with a
 * shadowRoot. It is a no-op whenever focus is outside of any shadow tree, so it is
 * safe for the rest of the page.
 */
function patchGlobalSelectionForShadowDom(): void {
  if (isGlobalSelectionPatched || typeof window === 'undefined') {
    return;
  }

  isGlobalSelectionPatched = true;

  const nativeDocumentGetSelection = document.getSelection.bind(document);

  const getShadowAwareSelection = (): Selection | null => {
    const focusedShadowRoot = getFocusedShadowRoot();

    if (focusedShadowRoot && typeof (focusedShadowRoot as any).getSelection === 'function') {
      return (focusedShadowRoot as any).getSelection();
    }

    return nativeDocumentGetSelection();
  };

  window.getSelection = getShadowAwareSelection;
  Document.prototype.getSelection = getShadowAwareSelection;
}

/**
 * Returns the appropriate event target for document-level events.
 * In shadow DOM context, events should be listened on the shadow root
 * for better encapsulation.
 *
 * @returns EventTarget - document or shadow root
 */
export function getDocumentEventTarget(): EventTarget {
  if (currentShadowRoot) {
    return currentShadowRoot;
  }

  return document;
}

/**
 * Returns the node to use as the scope element for floating UI elements.
 * In shadow DOM context, this should be the shadow root's host element or
 * a container within the shadow root rather than document.body.
 *
 * @param fallback - fallback element to use in shadow DOM context
 * @returns HTMLElement
 */
export function getScopeElement(fallback?: HTMLElement): HTMLElement {
  if (currentShadowRoot && fallback) {
    return fallback;
  }

  return document.body;
}

/**
 * Returns the active element, respecting shadow DOM boundaries.
 *
 * @returns Element or null
 */
export function getActiveElement(): Element | null {
  if (currentShadowRoot) {
    return currentShadowRoot.activeElement;
  }

  return document.activeElement;
}

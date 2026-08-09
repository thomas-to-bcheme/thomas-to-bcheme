/**
 * Shared scroll-and-focus helper for /glossary's three "jump to an anchor
 * that might not be in the DOM yet" call sites: GlossaryStackDiagram's
 * click-to-scroll, the on-mount deep-link handler, and a related-term pill
 * click. Centralized so all three get the same accessibility behavior —
 * scrollIntoView alone moves the viewport but leaves keyboard/screen-reader
 * users without the sighted "jump" a click implies, so this also moves focus
 * to the target (temporarily made focusable via tabindex if it isn't
 * already).
 */
export function scrollToAnchor(id: string, options: { prefersReducedMotion?: boolean } = {}): void {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[glossary] scrollToAnchor: no element found for id "${id}"`);
    return;
  }

  el.scrollIntoView({ behavior: options.prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });

  const hadTabIndex = el.hasAttribute('tabindex');
  if (!hadTabIndex) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  if (!hadTabIndex) {
    // Drop the tabindex again once focus has moved past it, so it doesn't
    // permanently join the page's natural tab order.
    const cleanup = () => el.removeAttribute('tabindex');
    el.addEventListener('blur', cleanup, { once: true });
  }
}

/**
 * Shared nav active-state predicate.
 *
 * Every nav surface previously compared `pathname === href`. That was correct
 * only because every route on the site was a leaf. The /ai-ml section adds
 * nested routes (/ai-ml/<category>/<model>), where an exact match would leave
 * both the "AI/ML" group trigger and its "Classical ML" item unhighlighted on
 * every model page — the majority of the site's pages.
 *
 * Prefix matching is generic rather than /ai-ml-specific: it also covers any
 * future sub-route under an existing entry, and it is a no-op for today's
 * childless routes. `href === '/'` is naturally safe because no pathname
 * starts with '//'.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

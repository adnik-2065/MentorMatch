/**
 * One focus treatment for the whole app.
 *
 * It used to be copied into a dozen components, which is how two of them ended
 * up with a different ring offset. Never removed, only replaced with a
 * stronger ring.
 */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** Same ring, for controls sitting on a `surface` panel rather than the page. */
export const focusRingOnSurface =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

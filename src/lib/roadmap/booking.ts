/**
 * Extension point for mentor-session booking.
 *
 * Slots and bookings still live in the browser (see lib/account.ts), so
 * there's nothing on the server a roadmap can book against yet. When the
 * Slot/Session models land, return the booking URL for this mentor and
 * topic here — every "recommended session" in the roadmap UI already
 * renders a Book button whenever this returns a link.
 */
export function sessionBookingHref(_mentorId: string | null, _topic: string): string | null {
  return null;
}

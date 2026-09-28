"use client";

import { useState } from "react";
import { Badge, Button, Chip, Textarea } from "@/components/ui";
import { IconCheck, IconStar } from "@/components/icons";
import { RATING_TAGS, type Session } from "@/lib/dashboard";

/**
 * Ratings are blind and mutual — neither side sees the other's score until both
 * have submitted, so nobody rates defensively.
 */
export function RateSessionCard({ session }: { session: Session }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const shown = hover || rating;

  const toggleTag = (tag: string) =>
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  if (sent) {
    return (
      <div className="rounded-xl border border-success/30 bg-success-soft p-5">
        <Badge tone="success">
          <IconCheck className="h-3 w-3" />
          Rating sent
        </Badge>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Thanks — it stays hidden until {session.with} rates you too. Your next booking is
          unlocked.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft/40 p-5">
      <Badge tone="warning">Rate to unlock your next booking</Badge>

      <h3 className="mt-3 font-sans text-lg font-semibold text-fg">
        How was {session.topic} with {session.with}?
      </h3>
      <p className="mt-1 text-sm text-muted">
        {session.day}, {session.time} · {session.concept}
      </p>

      <div
        role="radiogroup"
        aria-label="Rating out of 5"
        className="mt-4 flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconStar
              filled={n <= shown}
              className={`h-6 w-6 transition-colors duration-150 ${
                n <= shown ? "text-warning" : "text-line-strong"
              }`}
            />
          </button>
        ))}
        <span aria-live="polite" className="ml-2 text-sm text-muted">
          {rating > 0 ? `${rating} of 5` : "Tap a star"}
        </span>
      </div>

      {rating > 0 && (
        <div className="mt-5 space-y-5 motion-safe:animate-[fadeIn_200ms_ease-out]">
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-fg">What went well?</legend>
            <div className="flex flex-wrap gap-2">
              {RATING_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </fieldset>

          <Textarea
            id="rating-note"
            label="Anything else? (optional)"
            hint="Only the mentor sees this, and only after they've rated you."
            rows={3}
            value={note}
            placeholder="One line is plenty…"
            onChange={(e) => setNote(e.target.value)}
          />

          <Button onClick={() => setSent(true)}>Submit rating</Button>
        </div>
      )}
    </div>
  );
}

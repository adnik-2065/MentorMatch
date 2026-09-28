"use client";

import { useState } from "react";
import { IconBolt } from "@/components/icons";

/**
 * Instant Help — while this is on, urgent doubts in your subjects ping you
 * directly instead of waiting for a booked slot.
 */
export function OnlineToggle() {
  const [online, setOnline] = useState(true);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            online ? "bg-primary-soft text-primary-text" : "bg-inset text-faint"
          }`}
        >
          <IconBolt className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-medium text-fg">Instant Help</p>
          <p className="mt-0.5 max-w-[46ch] text-xs leading-relaxed text-faint">
            {online
              ? "You're visible to juniors with urgent doubts right now."
              : "Only your published slots are bookable. Nothing pings you."}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={online}
        aria-label="Instant Help"
        onClick={() => setOnline((v) => !v)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          online ? "border-primary bg-primary" : "border-line-strong bg-inset"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
            online ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

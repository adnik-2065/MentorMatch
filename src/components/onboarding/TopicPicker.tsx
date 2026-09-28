"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui";
import { IconSearch, IconPlus, IconClose } from "@/components/icons";
import { TOPIC_GROUPS } from "@/lib/onboarding";

export function TopicPicker({
  label,
  hint,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  selected: string[];
  onToggle: (topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Custom topics the user typed in aren't in TOPIC_GROUPS, so they get their own row.
  const custom = useMemo(
    () => selected.filter((t) => !TOPIC_GROUPS.some((g) => g.topics.includes(t))),
    [selected],
  );

  const groups = useMemo(() => {
    const all = custom.length ? [{ name: "Added by you", topics: custom }, ...TOPIC_GROUPS] : TOPIC_GROUPS;
    if (!q) return all;
    return all
      .map((g) => ({ ...g, topics: g.topics.filter((t) => t.toLowerCase().includes(q)) }))
      .filter((g) => g.topics.length > 0);
  }, [q, custom]);

  const matchCount = groups.reduce((n, g) => n + g.topics.length, 0);
  const exactExists = TOPIC_GROUPS.concat({ name: "", topics: custom }).some((g) =>
    g.topics.some((t) => t.toLowerCase() === q),
  );

  const addCustom = () => {
    const value = query.trim();
    if (!value || exactExists) return;
    onToggle(value);
    setQuery("");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-fg">{label}</h3>
        {selected.length > 0 && (
          <p aria-live="polite" className="text-xs text-faint">
            {selected.length} selected
          </p>
        )}
      </div>
      {hint && <p className="-mt-2 text-xs text-faint">{hint}</p>}

      {/* Search */}
      <div className="relative">
        <label htmlFor="topic-search" className="sr-only">
          Search topics
        </label>
        <span
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        >
          <IconSearch />
        </span>
        <input
          id="topic-search"
          type="search"
          value={query}
          placeholder="Search topics — try docker, java, placement…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matchCount === 0) addCustom();
            }
          }}
          className="min-h-11 w-full rounded-lg border border-line bg-surface py-2.5 pr-11 pl-10 text-sm text-fg transition-colors duration-200 outline-none placeholder:text-faint hover:border-line-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-faint transition-colors duration-200 outline-none hover:bg-inset hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconClose />
          </button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {q ? `${matchCount} topics match ${query}` : ""}
      </p>

      {/* Results */}
      {matchCount > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.name}>
              <h4 className="mb-2.5 text-xs font-medium tracking-wide text-faint uppercase">
                {group.name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {group.topics.map((topic) => (
                  <Chip
                    key={topic}
                    label={topic}
                    selected={selected.includes(topic)}
                    onClick={() => onToggle(topic)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-inset p-5 text-center">
          <p className="text-sm text-muted">
            No topic matches <span className="font-medium text-fg">&ldquo;{query}&rdquo;</span>
          </p>
          <button
            type="button"
            onClick={addCustom}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <IconPlus />
            Add &ldquo;{query.trim()}&rdquo; as a topic
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui";
import { IconSearch, IconPlus, IconClose } from "@/components/icons";
import { ALL_TOPIC_GROUPS, BRANCH_TOPICS, topicGroupsFor } from "@/lib/onboarding";

export function TopicPicker({
  label,
  hint,
  branch,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  branch: string;
  selected: string[];
  onToggle: (topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  // "Other" and unknown branches have no subject list of their own — show everything.
  const hasOwnSubjects = Boolean(BRANCH_TOPICS[branch]);
  const [allBranches, setAllBranches] = useState(!hasOwnSubjects);

  const q = query.trim().toLowerCase();
  const scoped = allBranches || !hasOwnSubjects;

  const base = useMemo(
    () => (scoped ? ALL_TOPIC_GROUPS : topicGroupsFor(branch)),
    [scoped, branch],
  );

  // Custom topics the user typed in aren't in any group, so they get their own row.
  const custom = useMemo(() => {
    const known = new Set(ALL_TOPIC_GROUPS.flatMap((g) => g.topics));
    return selected.filter((t) => !known.has(t));
  }, [selected]);

  // Anything picked before switching branch stays visible, otherwise it looks lost.
  const offScope = useMemo(() => {
    const inScope = new Set(base.flatMap((g) => g.topics));
    return selected.filter((t) => !inScope.has(t) && !custom.includes(t));
  }, [base, selected, custom]);

  const filter = (groups: { name: string; topics: string[] }[]) =>
    !q
      ? groups
      : groups
          .map((g) => ({ ...g, topics: g.topics.filter((t) => t.toLowerCase().includes(q)) }))
          .filter((g) => g.topics.length > 0);

  const groups = useMemo(() => {
    const extras = [
      ...(custom.length ? [{ name: "Added by you", topics: custom }] : []),
      ...(offScope.length ? [{ name: "From other branches", topics: offScope }] : []),
    ];
    return filter([...extras, ...base]);
  }, [base, custom, offScope, q]);

  const matchCount = groups.reduce((n, g) => n + g.topics.length, 0);

  // When a search finds nothing in-branch, say how many hits exist everywhere else.
  const elsewhere = useMemo(() => {
    if (scoped || !q || matchCount > 0) return 0;
    return ALL_TOPIC_GROUPS.reduce(
      (n, g) => n + g.topics.filter((t) => t.toLowerCase().includes(q)).length,
      0,
    );
  }, [scoped, q, matchCount]);

  const exactExists = [...ALL_TOPIC_GROUPS.flatMap((g) => g.topics), ...custom].some(
    (t) => t.toLowerCase() === q,
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
          placeholder="Search subjects — try surveying, thermo, docker…"
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

      {/* Scope — your branch by default, everything if you want to cross over */}
      {hasOwnSubjects && (
        <div role="radiogroup" aria-label="Which subjects to show" className="flex flex-wrap gap-2">
          {[
            { value: false, label: `${branch} subjects` },
            { value: true, label: "All branches" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={allBranches === option.value}
              onClick={() => setAllBranches(option.value)}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                allBranches === option.value
                  ? "border-primary bg-primary-soft font-medium text-primary-text"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

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
            No subject in {scoped ? "our list" : branch} matches{" "}
            <span className="font-medium text-fg">&ldquo;{query}&rdquo;</span>
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {elsewhere > 0 && (
              <button
                type="button"
                onClick={() => setAllBranches(true)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary bg-primary-soft px-4 text-sm font-medium text-primary-text transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <IconSearch />
                {elsewhere} in other branches
              </button>
            )}
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <IconPlus />
              Add &ldquo;{query.trim()}&rdquo; as a topic
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

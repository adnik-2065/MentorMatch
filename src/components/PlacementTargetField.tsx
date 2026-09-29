"use client";

import { useId, useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function PlacementTargetField({
  id,
  label,
  hint,
  placeholder,
  options,
  selected,
  onChange,
  compact = false,
}: {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const generatedId = useId();
  const listId = `${id}-${generatedId.replaceAll(":", "")}-options`;
  const selectedLower = new Set(selected.map((value) => value.toLowerCase()));
  const suggestions = options
    .filter((option) => !selectedLower.has(option.toLowerCase()))
    .slice(0, compact ? 4 : 6);

  const add = (rawValue = query) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const canonical = options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    if (selectedLower.has(canonical.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...selected, canonical]);
    setQuery("");
  };

  const remove = (value: string) => {
    onChange(selected.filter((item) => item.toLowerCase() !== value.toLowerCase()));
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-fg">{label}</label>
        {hint && <p className="mt-1 text-xs leading-5 text-faint">{hint}</p>}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {selected.map((value) => (
            <span key={value} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-soft px-2.5 text-xs font-medium text-primary-text">
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove ${value}`}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-primary/10 ${focus}`}
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="search"
          list={listId}
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className={`min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint hover:border-line-strong ${focus}`}
        />
        <datalist id={listId}>
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
        <button
          type="button"
          onClick={() => add()}
          disabled={!query.trim()}
          aria-label={`Add ${label.toLowerCase()}`}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-xs font-semibold text-fg hover:border-primary/40 hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}
        >
          <IconPlus />
          <span className={compact ? "sr-only" : ""}>Add</span>
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => add(option)}
              className={`rounded-lg border border-line bg-inset px-2.5 py-1.5 text-[11px] text-muted hover:border-primary/30 hover:text-fg ${focus}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

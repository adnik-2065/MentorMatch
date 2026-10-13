import { IconTrend } from "@/components/icons";
import { trendPercent } from "@/lib/activity";

export function ActivityChart({
  title,
  value,
  note,
  values,
  labels,
  /** What to say when there's nothing in the window yet. */
  emptyBody,
}: {
  title: string;
  value: string;
  note: string;
  values: number[];
  labels: string[];
  emptyBody?: string;
}) {
  const peak = Math.max(...values, 1);
  const empty = values.every((v) => v === 0);
  // Computed from the series, not typed in — a flat "12% this week" was wrong
  // for every account that wasn't the one it was written against.
  const trend = empty ? null : trendPercent(values);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgb(23_26_43/0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">{title}</p>
          <p className="mt-2 font-sans text-3xl font-semibold tracking-tight text-fg">{value}</p>
          <p className="mt-1 text-xs text-faint">{note}</p>
        </div>
        {trend !== null && trend !== 0 && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
              trend > 0 ? "bg-success-soft text-success" : "bg-inset text-muted"
            }`}
          >
            <IconTrend className={`h-3.5 w-3.5 ${trend > 0 ? "" : "-scale-y-100"}`} />
            {trend > 0 ? "+" : ""}
            {trend}% vs earlier this week
          </span>
        )}
      </div>

      {empty ? (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-inset/40 px-4 py-6 text-center text-sm leading-relaxed text-muted">
          {emptyBody ?? "Nothing here yet — this fills in as you use MentorMatch."}
        </p>
      ) : (
        <div className="mt-7 flex h-36 items-end gap-2 sm:gap-3" aria-hidden="true">
          {values.map((count, index) => (
            <div key={labels[index] ?? index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex h-full w-full items-end justify-center rounded-lg bg-inset px-1.5">
                <span className="absolute -top-6 hidden rounded-md bg-nav px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">{count}</span>
                <div
                  className={`w-full rounded-md transition-all duration-300 ${index === values.length - 1 ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/45"}`}
                  style={{ height: `${Math.max(10, (count / peak) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-faint">{labels[index]}</span>
            </div>
          ))}
        </div>
      )}

      {/* The bars are decorative; this is the same data a screen reader can read. */}
      {!empty && (
        <p className="sr-only">
          {values.map((count, index) => `${labels[index]}: ${count}`).join(", ")}
        </p>
      )}
    </div>
  );
}

/** Pace wording follows the number — it used to say "On track" at any value. */
function paceFor(value: number, tasks: number) {
  if (tasks === 0) return "Nothing to practise yet";
  if (value >= 100) return "All done";
  if (value >= 60) return "On track";
  if (value > 0) return "Getting started";
  return "Not started";
}

export function ProgressRing({
  value,
  label,
  detail,
  tasks,
}: {
  value: number;
  label: string;
  detail: string;
  /** How many practice tasks the percentage is over, so the pace can be honest. */
  tasks: number;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgb(23_26_43/0.04)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Weekly goal</p>
      <div className="mt-5 flex items-center gap-5">
        <div
          role="progressbar"
          aria-valuenow={safe}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Practice tasks complete"
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) ${safe * 3.6}deg, var(--inset) 0deg)` }}
        >
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-surface">
            <span className="font-sans text-xl font-semibold tabular-nums text-fg">{safe}%</span>
          </div>
        </div>
        <div>
          <p className="font-sans text-base font-semibold text-fg">{label}</p>
          <p className="mt-1 text-xs leading-5 text-faint">{detail}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Current pace</span>
          <strong className="text-fg">{paceFor(safe, tasks)}</strong>
        </div>
      </div>
    </div>
  );
}

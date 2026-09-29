import { IconTrend } from "@/components/icons";

export function ActivityChart({
  title,
  value,
  note,
  values,
  labels,
}: {
  title: string;
  value: string;
  note: string;
  values: number[];
  labels: string[];
}) {
  const peak = Math.max(...values, 1);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgb(23_26_43/0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">{title}</p>
          <p className="mt-2 font-sans text-3xl font-semibold tracking-tight text-fg">{value}</p>
          <p className="mt-1 text-xs text-faint">{note}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success">
          <IconTrend className="h-3.5 w-3.5" /> 12% this week
        </span>
      </div>

      <div className="mt-7 flex h-36 items-end gap-2 sm:gap-3" aria-label={`${title} bar chart`}>
        {values.map((value, index) => (
          <div key={labels[index]} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex h-full w-full items-end justify-center rounded-lg bg-inset px-1.5">
              <span className="absolute -top-6 hidden rounded-md bg-nav px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">{value}</span>
              <div
                className={`w-full rounded-md transition-all duration-300 ${index === values.length - 2 ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/45"}`}
                style={{ height: `${Math.max(10, (value / peak) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-faint">{labels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressRing({ value, label, detail }: { value: number; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgb(23_26_43/0.04)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Weekly goal</p>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--inset) 0deg)` }}
        >
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-surface">
            <span className="font-sans text-xl font-semibold text-fg">{value}%</span>
          </div>
        </div>
        <div>
          <p className="font-sans text-base font-semibold text-fg">{label}</p>
          <p className="mt-1 text-xs leading-5 text-faint">{detail}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between text-xs"><span className="text-muted">Current pace</span><strong className="text-fg">On track</strong></div>
      </div>
    </div>
  );
}

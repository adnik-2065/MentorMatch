"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { signOut } from "@/lib/account";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** Student and mentor are two hats on one account, so the switch lives in the header. */
function RoleSwitch({ role }: { role: "student" | "mentor" }) {
  const tabs = [
    { key: "student", label: "Learning", href: "/dashboard" },
    { key: "mentor", label: "Mentoring", href: "/mentor" },
  ] as const;

  return (
    <nav aria-label="Switch role" className="flex rounded-full border border-line bg-surface p-1">
      {tabs.map((tab) => {
        const active = tab.key === role;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm transition-colors duration-200 ${focus} ${
              active ? "bg-primary-soft font-medium text-primary-text" : "text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  role,
  name,
  meta,
  demo = false,
  children,
}: {
  role: "student" | "mentor";
  name: string;
  meta: string;
  demo?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2) || "?";

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5 sm:px-6">
          <Link
            href="/"
            className={`font-sans text-sm font-semibold tracking-tight text-fg ${focus} rounded-md`}
          >
            MentorMatch
          </Link>

          <RoleSwitch role={role} />

          <div className="ml-auto flex items-center gap-2.5">
            {demo && <Badge tone="warning">Sample account</Badge>}
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-text"
            >
              {initials}
            </span>
            <span className="hidden text-sm text-muted sm:inline">
              {name}
              {meta && ` · ${meta}`}
            </span>
            <button
              type="button"
              onClick={async () => {
                signOut();
                // Also end the server session that roadmaps use; ignore failures, we're leaving anyway.
                await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
                router.push("/signin");
              }}
              className={`min-h-9 cursor-pointer rounded-lg px-2.5 text-sm text-faint transition-colors duration-200 hover:bg-inset hover:text-fg ${focus}`}
            >
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-8 pb-16 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-sans text-base font-semibold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-faint">
        {icon}
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className="mt-2.5 font-sans text-2xl font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-inset p-6 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Shown while localStorage is being read, and when nobody is signed in. */
export function DashboardGate({
  ready,
  signedIn,
  title,
  body,
  cta,
}: {
  ready: boolean;
  signedIn: boolean;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  if (!ready) {
    return (
      <div className="min-h-screen bg-bg">
        <p className="mx-auto max-w-5xl px-5 py-20 text-sm text-faint sm:px-6">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-6 sm:py-28">
        <h1 className="font-sans text-2xl font-semibold text-fg">{title}</h1>
        <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={cta.href}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
          >
            {cta.label}
          </Link>
          {signedIn && (
            <Link
              href="/signin"
              className={`inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
            >
              Switch account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

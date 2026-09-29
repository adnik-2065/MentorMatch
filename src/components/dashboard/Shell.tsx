"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import {
  IconCompass,
  IconGraduation,
  IconHome,
  IconSearch,
  IconSparkle,
  IconTeach,
} from "@/components/icons";
import { signOut } from "@/lib/account";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function RoleSwitch({ role }: { role: "student" | "mentor" }) {
  const tabs = [
    { key: "student", label: "Learning", href: "/dashboard", icon: <IconGraduation /> },
    { key: "mentor", label: "Mentoring", href: "/mentor", icon: <IconTeach /> },
  ] as const;

  return (
    <nav aria-label="Switch role" className="grid grid-cols-2 rounded-xl bg-inset p-1">
      {tabs.map((tab) => {
        const active = tab.key === role;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-all ${focus} ${
              active
                ? "bg-surface text-fg shadow-[0_2px_8px_rgb(23_26_43/0.08)]"
                : "text-faint hover:text-fg"
            }`}
          >
            <span className={active ? "text-primary-text" : "text-faint"}>{tab.icon}</span>
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
  active = "dashboard",
  children,
}: {
  role: "student" | "mentor";
  name: string;
  meta: string;
  demo?: boolean;
  active?: "dashboard" | "discover";
  children: ReactNode;
}) {
  const router = useRouter();
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2) || "?";
  const dashboardHref = role === "mentor" ? "/mentor" : "/dashboard";
  const nav = [
    { key: "dashboard", label: "Overview", href: dashboardHref, icon: <IconHome /> },
    { key: "discover", label: "Find a mentor", href: "/discover", icon: <IconCompass /> },
  ] as const;

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:block lg:px-5 lg:pt-6">
          <Link href="/" className={`inline-flex items-center gap-2.5 rounded-lg font-sans font-semibold tracking-tight text-fg ${focus}`}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-on-primary shadow-[0_7px_18px_rgb(var(--primary-shadow)/0.24)]">
              <IconSparkle className="h-4 w-4" />
            </span>
            MentorMatch
          </Link>
          <div className="w-52 max-w-[55vw] lg:mt-7 lg:w-auto"><RoleSwitch role={role} /></div>
        </div>

        <div className="border-t border-line px-3 py-3 lg:mt-5 lg:border-t-0 lg:px-4 lg:py-0">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-faint lg:block">Workspace</p>
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active === item.key ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${focus} ${
                  active === item.key
                    ? "bg-primary-soft text-primary-text"
                    : "text-muted hover:bg-inset hover:text-fg"
                }`}
              >
                {item.icon}
                {item.label}
                {active === item.key && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary lg:block" />}
              </Link>
            ))}
            <Link href="/onboarding" className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-inset hover:text-fg ${focus}`}>
              <IconSparkle />
              Edit profile
            </Link>
          </nav>
        </div>

        <div className="mt-auto hidden px-4 pb-5 lg:block">
          <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-soft to-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-fg">Profile strength</p>
              <span className="text-xs font-bold text-primary-text">76%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full w-3/4 rounded-full bg-primary" /></div>
            <p className="mt-3 text-[11px] leading-5 text-muted">A complete profile earns stronger, more relevant matches.</p>
            <Link href="/onboarding" className="mt-3 inline-flex text-xs font-bold text-primary-text">Complete profile →</Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/92 backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center gap-4 px-5 sm:px-8 lg:px-9">
            <Link href="/discover" className={`hidden min-h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 text-sm text-faint transition-colors hover:border-primary/25 hover:bg-surface sm:flex ${focus}`}>
              <IconSearch className="h-4 w-4" />
              <span className="truncate">Search mentors, skills or blockers</span>
              <span className="ml-auto rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-faint">⌘ K</span>
            </Link>

            <div className="ml-auto flex items-center gap-3">
              {demo && <Badge tone="warning">Demo</Badge>}
              <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-end)] text-xs font-bold text-on-primary shadow-sm">{initials}</span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-bold text-fg">{name}</span>
                <span className="block truncate text-[11px] text-faint">{meta}</span>
              </span>
              <button
                type="button"
                onClick={() => { signOut(); router.push("/signin"); }}
                className={`min-h-9 cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-faint hover:bg-inset hover:text-fg ${focus}`}
              >
                Switch
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 pb-16 sm:px-8 lg:px-9 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-9 first:mt-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_26_43/0.02)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-faint">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary-text">{icon}</span>
      </div>
      <p className="mt-3 font-sans text-[28px] font-semibold leading-none tracking-tight tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-2 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-7 text-center">
      <p className="text-sm font-bold text-fg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-sm leading-6 text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

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
  if (!ready) return <div className="min-h-screen bg-bg p-10 text-sm text-faint">Loading your workspace…</div>;

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-5">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-[0_24px_70px_rgb(23_26_43/0.08)]">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-text"><IconSparkle /></span>
        <h1 className="mt-5 font-sans text-2xl font-semibold text-fg">{title}</h1>
        <p className="mx-auto mt-2 max-w-[50ch] text-sm leading-6 text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={cta.href} className={`inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-hover ${focus}`}>{cta.label}</Link>
          {signedIn && <Link href="/signin" className={`inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold text-fg hover:bg-inset ${focus}`}>Switch account</Link>}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { IconArrowRight, IconGraduation, IconSparkle, IconTeach } from "@/components/icons";
import { signIn, useAccount } from "@/lib/account";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const card =
  "group block w-full cursor-pointer rounded-xl border border-line bg-surface p-5 text-left transition-colors duration-200 hover:border-primary hover:bg-primary-soft/40";

export function SignIn() {
  const router = useRouter();
  const { ready, profile } = useAccount();

  const enter = (id: "me" | "demo", href: string) => {
    signIn(id);
    router.push(href);
  };

  const ownHref = profile?.role === "mentor" ? "/mentor" : "/dashboard";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6 sm:py-24">
      <Link
        href="/"
        className={`text-sm font-medium tracking-wide text-primary-text uppercase ${focus} rounded-md`}
      >
        MentorMatch
      </Link>

      <h1 className="mt-4 font-sans text-3xl font-semibold text-fg">Sign in</h1>
      <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-muted">
        No passwords in this build — pick an account. Your own account is whatever you filled in
        during onboarding, stored in this browser.
      </p>

      <div className="mt-8 space-y-3">
        {/* Rendered only after mount, because the profile lives in localStorage. */}
        {ready && profile && (
          <button type="button" onClick={() => enter("me", ownHref)} className={`${card} ${focus}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">Your account</Badge>
              <span className="font-sans font-semibold text-fg">
                {profile.name.trim() || "Unnamed"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {[profile.year, profile.branch, profile.college.trim()].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2.5 flex items-center gap-2 text-sm font-medium text-primary-text">
              Continue
              <IconArrowRight />
            </p>
          </button>
        )}

        {ready && !profile && (
          <div className="rounded-xl border border-dashed border-line bg-inset p-5">
            <p className="text-sm font-medium text-fg">You don&apos;t have an account yet</p>
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted">
              Finish onboarding once and your dashboard fills with your own name, subjects and
              slots — not sample data.
            </p>
            <Link
              href="/onboarding"
              className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
            >
              Start onboarding
              <IconArrowRight />
            </Link>
          </div>
        )}

        <div className="pt-4">
          <h2 className="text-xs font-medium tracking-wide text-faint uppercase">
            Or open a sample account
          </h2>
          <p className="mt-1.5 max-w-[54ch] text-xs leading-relaxed text-faint">
            Pre-filled with sessions, requests and ratings so you can see a dashboard that&apos;s
            been in use for a while. Nothing here touches your own account.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => enter("demo", "/dashboard")}
              className={`${card} ${focus}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-inset text-muted">
                <IconGraduation className="h-5 w-5" />
              </span>
              <p className="mt-3 font-sans font-semibold text-fg">Aditya N.</p>
              <p className="mt-0.5 text-xs text-faint">2nd Year Civil · sample student</p>
              <p className="mt-2 text-xs text-muted">6 sessions, 1 waiting to be rated</p>
            </button>

            <button
              type="button"
              onClick={() => enter("demo", "/mentor")}
              className={`${card} ${focus}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-inset text-muted">
                <IconTeach className="h-5 w-5" />
              </span>
              <p className="mt-3 font-sans font-semibold text-fg">Meera J.</p>
              <p className="mt-0.5 text-xs text-faint">4th Year Civil · sample mentor</p>
              <p className="mt-2 text-xs text-muted">3 requests, 34 sessions held</p>
            </button>
          </div>
        </div>
      </div>

      <p className="mt-10 flex items-start gap-2.5 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        <span className="mt-0.5 shrink-0 text-primary-text">
          <IconSparkle className="h-3.5 w-3.5" />
        </span>
        Accounts live in this browser only — no server, no password. Real auth is college email +
        OTP, which is already wired into onboarding.
      </p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card, Input } from "@/components/ui";
import { IconArrowRight, IconShield } from "@/components/icons";
import { DashboardShell } from "@/components/dashboard/Shell";
import { loadProfile } from "@/lib/account";
import { COLLEGE_EMAIL, OTP_LENGTH, normalizeOtpInput, type ProfileInput, type SessionUser } from "@/lib/auth-shared";
import { api, ApiError, useApi } from "@/lib/roadmap/client";
import { ErrorState, InlineError, PageSkeleton, focus } from "./bits";

/**
 * Roadmaps live on the server, so they need a real session — unlike the rest
 * of the dashboard, which still reads localStorage. This gate signs the
 * person in with their college email and copies their onboarding profile
 * onto the account, then renders the page inside the usual dashboard shell.
 */

/** The onboarding profile, but only if it belongs to this email — a shared laptop mustn't cross wires. */
function localProfileFor(email: string): ProfileInput | undefined {
  const p = loadProfile();
  if (!p || p.email.trim().toLowerCase() !== email.trim().toLowerCase()) return undefined;
  return {
    name: p.name,
    college: p.college,
    year: p.year,
    branch: p.branch,
    role: p.role,
    learnTopics: p.learnTopics,
    teachTopics: p.teachTopics,
  };
}

export function AccountGate({
  role,
  children,
}: {
  role: "student" | "mentor";
  children: (user: SessionUser) => ReactNode;
}) {
  const { data, error, loading, reload } = useApi<{ user: SessionUser | null }>("/api/me");
  const user = data?.user ?? null;
  const synced = useRef<string | null>(null);

  // Onboarding can change after sign-in (e.g. someone starts mentoring), so re-sync once per visit.
  useEffect(() => {
    if (!user || synced.current === user.id) return;
    synced.current = user.id;
    const profile = localProfileFor(user.email);
    if (profile) void api("/api/me", { method: "PATCH", body: profile }).catch(() => {});
  }, [user]);

  if (loading && !data) {
    return (
      <Frame>
        <PageSkeleton />
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <ErrorState title="We couldn't check your sign-in" body={error.message} onRetry={reload} />
      </Frame>
    );
  }

  if (!user) {
    return (
      <Frame>
        <SignInCard role={role} onSignedIn={reload} />
      </Frame>
    );
  }

  return (
    <DashboardShell role={role} name={user.name || "You"} meta={[user.year, user.branch].filter(Boolean).join(" ")}>
      {children(user)}
    </DashboardShell>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6 sm:py-24">
        <Link href="/" className={`text-sm font-medium tracking-wide text-primary-text uppercase ${focus} rounded-md`}>
          MentorMatch
        </Link>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function SignInCard({ role, onSignedIn }: { role: "student" | "mentor"; onSignedIn: () => void }) {
  const [email, setEmail] = useState(() => loadProfile()?.email ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validEmail = COLLEGE_EMAIL.test(email.trim());

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/code", { method: "POST", body: { email } });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/verify", { method: "POST", body: { email, code, profile: localProfileFor(email) } });
      onSignedIn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't verify the code.");
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">
        {role === "mentor" ? "Sign in to see shared roadmaps" : "Sign in to your learning roadmaps"}
      </h1>
      <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted">
        Roadmaps are saved to your account, so your progress follows you to any device. Sign in with
        your college email — we&apos;ll send a six-digit code.
      </p>

      <Card className="mt-6 space-y-5">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!sent && validEmail) void send();
            if (sent && code.length === OTP_LENGTH) void verify();
          }}
        >
          <Input
            id="gate-email"
            type="email"
            label="College email"
            hint="Your institute address, e.g. you@college.ac.in"
            autoComplete="email"
            value={email}
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
          />

          {sent && (
            <Input
              id="gate-code"
              label="Six-digit code"
              hint={`Sent to ${email}. It expires in 10 minutes.`}
              inputMode="numeric"
              autoComplete="one-time-code"
              // No maxLength: the browser would cut a pasted code before non-digits are stripped.
              value={code}
              autoFocus
              onChange={(e) => setCode(normalizeOtpInput(e.target.value))}
            />
          )}

          <InlineError message={error} />

          <div className="flex flex-wrap items-center gap-3">
            {!sent ? (
              <Button type="submit" disabled={!validEmail || busy}>
                {busy ? "Sending…" : "Send code"}
                <IconArrowRight />
              </Button>
            ) : (
              <>
                <Button type="submit" disabled={code.length !== OTP_LENGTH || busy}>
                  {busy ? "Checking…" : "Sign in"}
                  <IconArrowRight />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSent(false);
                    setCode("");
                    setError(null);
                  }}
                >
                  Use a different email
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>

      <p className="mt-6 flex items-start gap-2.5 text-xs leading-relaxed text-faint">
        <span className="mt-0.5 shrink-0 text-primary-text">
          <IconShield className="h-3.5 w-3.5" />
        </span>
        Your roadmaps are private. A mentor sees one only after you share it, and you can stop sharing
        at any time.
      </p>
    </div>
  );
}

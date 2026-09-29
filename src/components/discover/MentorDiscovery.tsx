"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/Shell";
import { PlacementTargetField } from "@/components/PlacementTargetField";
import { Badge, Button, Stars } from "@/components/ui";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconDot,
  IconSearch,
  IconSliders,
} from "@/components/icons";
import { loadProfile, saveProfile, useAccount } from "@/lib/account";
import {
  matchMentors,
  TARGET_COMPANIES,
  TARGET_JOB_ROLES,
  type Mentor,
} from "@/lib/onboarding";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type Sort = "match" | "rating" | "available";

export function MentorDiscovery() {
  const { ready, account, profile } = useAccount();
  const role = profile?.role === "mentor" ? "mentor" : "student";
  const topics = profile?.learnTopics.length
    ? profile.learnTopics
    : account === "demo"
      ? ["Structural Analysis", "AutoCAD", "Engineering Mathematics"]
      : ["Docker", "DSA", "AutoCAD"];
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState(topics[0] ?? "");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("match");
  const [selected, setSelected] = useState<Mentor | null>(null);
  const [slot, setSlot] = useState<{ day: string; time: string } | null>(null);
  const [booked, setBooked] = useState<Mentor | null>(null);

  useEffect(() => {
    if (!ready) return;
    setTargetCompanies(profile?.targetCompanies ?? []);
    setTargetRoles(profile?.targetRoles ?? []);
  }, [account, profile, ready]);

  const updatePlacementTargets = (companies: string[], roles: string[]) => {
    setTargetCompanies(companies);
    setTargetRoles(roles);
    if (account === "me" && profile) {
      saveProfile({ ...profile, targetCompanies: companies, targetRoles: roles });
    }
  };

  const matches = useMemo(() => {
    const ranked = matchMentors({
      query,
      topics: activeTopic ? [activeTopic] : topics,
      branch: profile?.branch || (account === "demo" ? "Civil" : ""),
      verifiedOnly,
      onlineOnly,
      targetCompanies,
      targetRoles,
    });
    if (sort === "rating") return [...ranked].sort((a, b) => b.mentor.rating - a.mentor.rating);
    if (sort === "available") return [...ranked].sort((a, b) => Number(b.mentor.online) - Number(a.mentor.online));
    return ranked;
  }, [account, activeTopic, onlineOnly, profile?.branch, query, sort, targetCompanies, targetRoles, topics, verifiedOnly]);

  const hasPlacementTargets = targetCompanies.length > 0 || targetRoles.length > 0;
  const exactPlacementMatches = hasPlacementTargets
    ? matches.filter((match) => match.placementMatch === "exact").length
    : 0;

  const confirmBooking = () => {
    if (!selected || !slot) return;
    if (account === "me") {
      const current = loadProfile();
      if (current) saveProfile({ ...current, booking: { mentor: selected, ...slot } });
    }
    setBooked(selected);
    setSelected(null);
    setSlot(null);
  };

  if (!ready) {
    return <div className="min-h-screen bg-bg p-10 text-sm text-faint">Loading matches…</div>;
  }

  return (
    <DashboardShell
      role={role}
      name={profile?.name.trim() || (account === "demo" ? "Aditya N." : "Guest")}
      meta={[profile?.year, profile?.branch].filter(Boolean).join(" · ") || (account === "demo" ? "2nd Year · Civil" : "Explore mentors")}
      demo={account === "demo"}
      active="discover"
    >
      <section className="relative isolate overflow-hidden rounded-[28px] border border-white/8 bg-nav px-6 py-8 text-white shadow-[0_24px_70px_rgb(16_25_21/0.18)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-20 -top-36 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-1/4 -z-10 h-32 w-48 bg-[radial-gradient(circle,rgba(78,213,165,0.12)_1px,transparent_1px)] bg-[size:12px_12px]" />
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Smart mentor matching</p>
          <h1 className="mt-4 max-w-2xl font-sans text-3xl font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[42px]">Find the senior who already knows the way through.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-nav-muted sm:text-base">Tell us the exact blocker. We rank mentors using subject fit, branch context, verified evidence, ratings and live availability.</p>
        </div>

        <div className="mt-7 flex max-w-3xl items-center gap-3 rounded-2xl border border-line-strong bg-surface p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.3)]">
          <IconSearch className="ml-3 h-5 w-5 shrink-0 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: my Docker container exits after startup"
            aria-label="Describe what you need help with"
            className={`min-h-12 min-w-0 flex-1 bg-transparent px-1 text-sm text-fg placeholder:text-faint ${focus}`}
          />
          <span className="hidden rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-on-primary shadow-[0_6px_16px_rgb(var(--primary-shadow)/0.24)] sm:block">Find matches</span>
        </div>
      </section>

      {booked && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-success/20 bg-success-soft px-5 py-4 text-sm text-success">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success text-white"><IconCheck /></span>
          <span><strong>{booked.name}</strong> is booked. Your dashboard has been updated.</span>
        </div>
      )}

      <div className="mt-8 grid gap-7 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside>
          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-[0_14px_40px_rgb(0_0_0/0.16)] lg:sticky lg:top-24">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary-text"><IconSliders className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-fg">Match preferences</p><p className="mt-0.5 text-[11px] text-faint">Tune recommendations</p></div>
              <span className="sr-only">Personalized filters</span>
            </div>
            <div className="mt-5">
              <label htmlFor="focus-topic" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Focus topic</label>
              <div className="relative mt-2">
                <select
                  id="focus-topic"
                  value={activeTopic}
                  onChange={(event) => setActiveTopic(event.target.value)}
                  className={`min-h-11 w-full appearance-none rounded-xl border border-line bg-inset/55 py-2.5 pl-3 pr-9 text-sm font-medium text-fg transition-colors hover:border-line-strong ${focus}`}
                >
                  {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">⌄</span>
              </div>
              <div className="mt-3 rounded-xl border border-primary/15 bg-primary-soft/55 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-text">Currently matching</p>
                <p className="mt-1 truncate text-xs font-medium text-fg" title={activeTopic}>{activeTopic}</p>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-faint">{topics.length} profile topics available</p>
              <div className="hidden">
                {topics.map((topic) => (
                  <button key={topic} type="button" onClick={() => setActiveTopic(topic)} className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${focus} ${activeTopic === topic ? "border-primary/35 bg-primary-soft text-primary-text shadow-[inset_0_0_0_1px_rgb(var(--primary-shadow)/0.08)]" : "border-line bg-surface text-muted hover:border-primary/30 hover:bg-inset/50"}`}>{topic}</button>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-5 border-t border-line pt-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Placement targets</p>
                <p className="mt-1 text-[11px] leading-4 text-faint">Optional. Experience shown below is self-reported.</p>
              </div>
              <PlacementTargetField
                id="discover-companies"
                label="Companies"
                placeholder="Add company"
                options={TARGET_COMPANIES}
                selected={targetCompanies}
                onChange={(companies) => updatePlacementTargets(companies, targetRoles)}
                compact
              />
              <PlacementTargetField
                id="discover-roles"
                label="Job roles"
                placeholder="Add role"
                options={TARGET_JOB_ROLES}
                selected={targetRoles}
                onChange={(roles) => updatePlacementTargets(targetCompanies, roles)}
                compact
              />
              {profile?.placementSeason && (
                <p className="rounded-lg bg-inset px-3 py-2 text-[11px] text-muted">
                  Placement season · <strong className="font-semibold text-fg">{profile.placementSeason}</strong>
                </p>
              )}
            </div>
            <div className="mt-5 space-y-3 border-t border-line pt-5">
              <FilterToggle label="Verified skills only" checked={verifiedOnly} onChange={setVerifiedOnly} />
              <FilterToggle label="Online right now" checked={onlineOnly} onChange={setOnlineOnly} />
            </div>
            <div className="mt-5 border-t border-line pt-5">
              <label htmlFor="sort" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Sort by</label>
              <select id="sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={`mt-2 min-h-11 w-full rounded-xl border border-line bg-inset/55 px-3 text-sm text-fg transition-colors hover:border-line-strong ${focus}`}>
                <option value="match">Best match</option>
                <option value="rating">Highest rated</option>
                <option value="available">Available now</option>
              </select>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-text">Recommended for you</p>
              <h2 className="mt-1.5 font-sans text-2xl font-semibold tracking-[-0.025em] text-fg">{matches.length} mentors matched</h2>
            </div>
            <p className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-faint">Scores update as you add context</p>
          </div>

          {hasPlacementTargets && exactPlacementMatches === 0 && (
            <div className="mb-4 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">
              No exact placement-experience match was found. Showing partial matches and skill-based alternatives, clearly labeled below.
            </div>
          )}

          <div className="space-y-3.5">
            {matches.map(({ mentor, score, matchedSkills, matchedCompanies = [], matchedRoles = [], placementMatch, reasons }, index) => (
              <article key={mentor.id} className={`group relative overflow-hidden rounded-[20px] border bg-surface p-5 shadow-[0_8px_30px_rgb(16_25_21/0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_44px_rgb(16_25_21/0.075)] sm:p-6 ${index === 0 ? "border-primary/30" : "border-line"}`}>
                {index === 0 && <div aria-hidden="true" className="absolute inset-y-5 left-0 w-0.5 rounded-r-full bg-primary" />}
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[14px] border border-primary/15 bg-primary-soft font-sans text-base font-semibold text-primary-text">{mentor.name.split(" ").map((part) => part[0]).join("")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-sans text-lg font-semibold text-fg">{mentor.name}</h3>
                          {mentor.online && <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><IconDot className="h-1.5 w-1.5" /> Online</span>}
                        </div>
                        <p className="mt-1 text-sm text-muted">{mentor.year} · {mentor.branch}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-right"><div className="flex items-center gap-1.5"><Stars rating={mentor.rating} /><strong className="text-sm text-fg">{mentor.rating}</strong></div><p className="mt-1 text-[11px] text-faint">{mentor.reviews} sessions</p></div>
                        <div className="h-9 w-px bg-line" />
                        <div className="text-right"><strong className="block text-sm font-semibold text-primary-text">{score}% match</strong><span className="text-[10px] text-faint">Profile fit</span></div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {mentor.skills.map((skill) => <span key={skill} className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${matchedSkills.includes(skill) ? "border-primary/15 bg-primary-soft text-primary-text" : "border-transparent bg-inset text-muted"}`}>{skill}</span>)}
                    </div>

                    {hasPlacementTargets && (
                      <div className="mt-4 rounded-xl border border-line bg-inset/55 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Placement experience</p>
                          <span className="text-[10px] text-faint">Self-reported</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mentor.companyExperience.map((company) => (
                            <span key={`company-${company}`} className={`rounded-md border px-2 py-1 text-[11px] ${matchedCompanies.includes(company) ? "border-primary/25 bg-primary-soft text-primary-text" : "border-line text-muted"}`}>
                              Company · {company}
                            </span>
                          ))}
                          {mentor.roleExperience.map((jobRole) => (
                            <span key={`role-${jobRole}`} className={`rounded-md border px-2 py-1 text-[11px] ${matchedRoles.includes(jobRole) ? "border-primary/25 bg-primary-soft text-primary-text" : "border-line text-muted"}`}>
                              Role · {jobRole}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                      {index === 0 && <Badge tone="primary">Best match</Badge>}
                      {placementMatch === "exact" && <Badge tone="success">Placement match</Badge>}
                      {placementMatch === "partial" && <Badge tone="warning">Partial placement match</Badge>}
                      {placementMatch === "alternative" && <Badge>Alternative</Badge>}
                      {reasons.slice(0, 2).map((reason) => <p key={reason} className="flex items-center gap-2 text-xs text-muted"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/55" />{reason}</p>)}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                      <p className="flex items-center gap-2 text-xs text-faint"><IconCalendar className="h-4 w-4" /> Next available <strong className="font-semibold text-fg">{mentor.slots[0].day}, {mentor.slots[0].time}</strong></p>
                      <div className="ml-auto flex gap-2">
                        <Button onClick={() => { setSelected(mentor); setSlot(mentor.slots[0]); }}>Book session</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <div role="dialog" aria-modal="true" aria-labelledby="booking-title" className="fixed inset-0 z-50 flex items-end justify-center bg-nav/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-text">Confirm session</p><h2 id="booking-title" className="mt-1 font-sans text-2xl font-semibold">Book {selected.name}</h2><p className="mt-1 text-sm text-muted">Choose one of their next available slots.</p></div>
              <button type="button" onClick={() => setSelected(null)} className={`rounded-lg px-2 py-1 text-sm text-faint hover:bg-inset ${focus}`}>Close</button>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {selected.slots.map((item) => {
                const active = slot?.day === item.day && slot.time === item.time;
                return <button key={`${item.day}-${item.time}`} type="button" onClick={() => setSlot(item)} className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors ${focus} ${active ? "border-primary bg-primary-soft text-primary-text" : "border-line hover:border-primary/30"}`}><IconClock /><span><strong>{item.day}</strong><span className="ml-1 text-faint">· {item.time}</span></span>{active && <IconCheck className="ml-auto" />}</button>;
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={!slot} onClick={confirmBooking}>Confirm booking</Button></div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function FilterToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-primary after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

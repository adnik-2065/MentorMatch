# MentorMatch

> A web based platform that connects junior college students with senior students who can guide them.

You're a first-year stuck on pointers in C. Somewhere two floors above you is a third-year who debugged the exact same segfault last semester. MentorMatch finds that person.

Instead of a generic "find a tutor" directory, MentorMatch is built around **topic-level matching** — you don't search for "a CS mentor", you search for `Docker`, `Java Collections`, `Git rebase`, or `Dynamic Programming`, and you get seniors who have *provably* worked with that exact topic.

---

## Table of Contents

- [The Problem](#the-problem)
- [The AI Kick: Proof of Skill + Mentor Twin](#-the-ai-kick-proof-of-skill--mentor-twin)
- [Onboarding](#onboarding)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

Every college has the same broken loop:

| Juniors | Seniors |
|---|---|
| Don't know *who* knows what | Willing to help, but nobody asks them |
| Ask in a 400-person WhatsApp group and get 2 replies | Get asked the same beginner question 40 times |
| Google → Stack Overflow → 6 tabs → still stuck | Have no way to show what they actually know |
| Can't tell if the "senior who knows React" actually does | Get no credit, no record, no reason to keep helping |

MentorMatch turns that informal, lossy, luck-based network into a searchable, verified, scheduled system — and uses AI to make it scale beyond the hours any human senior can give.

---

## 🧠 The AI Kick: Proof of Skill + Mentor Twin

Most mentorship platforms bolt on a chatbot and call it AI. MentorMatch uses AI for the two things that actually break peer mentoring: **trust** and **availability**.

### 1. SkillProof — verified skills, not self-declared ones

Anyone can tick a checkbox that says "I know Docker." That claim is worthless, and it's why most peer platforms die — juniors get matched with someone who's one chapter ahead of them.

**SkillProof** replaces the checkbox with evidence:

- The senior connects their **GitHub** and/or uploads a project. The AI reads the actual repos — Dockerfiles, `pom.xml`, commit history, branching patterns, test coverage — and extracts what they demonstrably *did*, not what they claim.
- The AI then runs a **short adaptive viva** (5–8 questions) on that topic, generated from their own code. Not trivia — questions like *"your `docker-compose.yml` mounts the source directory as a volume; what breaks if you don't, and why did you do it?"*
- Output: a signed **SkillProof badge** with a confidence level and a scope.

```
┌──────────────────────────────────────────────┐
│  Aarav S.  ·  3rd Year, CSE                  │
├──────────────────────────────────────────────┤
│  🐳 Docker          Verified · High          │
│     evidence: 4 repos, multi-stage builds,   │
│     compose networking, 2 CI pipelines       │
│                                              │
│  ☕ Java            Verified · Medium         │
│     evidence: Collections, Streams, JDBC     │
│     gap: concurrency untested                │
│                                              │
│  🔧 Git             Verified · High          │
│  🔤 C               Unverified — self-claimed │
└──────────────────────────────────────────────┘
```

Juniors see exactly how deep a mentor goes on a topic *before* booking. Seniors get a portfolio artifact worth putting on a resume. The incentive problem solves itself.

### 2. Mentor Twin — your mentor, available at 2 AM

A senior can give maybe 3 hours a week. Your assignment is due at 6 AM.

After a few sessions, a mentor can opt in to train a **Mentor Twin** — an AI assistant grounded in *that specific mentor's* material: their past session chats, their notes, their code snippets, the resources they recommend, and their explanation style.

- **Level 1 doubts** ("what does `-d` do in `docker run`?") → the Twin answers instantly, in your mentor's voice, using your mentor's examples.
- **Level 2 doubts** (conceptual confusion, design decisions) → the Twin answers *and* flags it for the human mentor to review.
- **Level 3 doubts** (the Twin isn't confident, or you're going in circles) → it **escalates automatically**, drafts a summary of what you already tried, and books the next open slot on the mentor's calendar.

Seniors stop answering the same question 40 times. Juniors get unblocked at midnight. Nobody wastes a live session on something a link could have solved.

> **Human-first guarantee:** The Twin always labels itself as AI, always cites which of the mentor's notes it drew from, and never pretends a session happened. It handles repetition so humans can handle judgment.

### 3. The rest of the AI layer

| Feature | What it does | Status |
|---|---|---|
| **Doubt Triage** | Paste your error log or describe the problem in plain English. The AI identifies the *actual* concept gap — a "React bug" that's really a JS closure misunderstanding — and routes you to the right mentor, not the obvious one. | ✅ built |
| **Session Recap** | Generates notes, next steps, and practice tasks after a session. Nothing gets forgotten. | ✅ built |
| **Match Explanations** | Every recommendation comes with a reason: *"Aarav is suggested because your error is a volume-mount issue, and he has verified Docker Compose experience across 4 repos."* No black-box ranking. | ✅ built (rule-based, not the model) |
| **Semantic Skill Graph** | Understands that `Kubernetes` implies `Docker`, that `Spring Boot` implies `Java` + `Maven`, that `CI/CD` touches `Git`. Surfaces mentors you'd never have thought to search for. | planned |
| **Roadmap Generator** | Tell it where you are and where you want to be. It produces a milestone plan with topics, practice tasks, and a suggested mentor per milestone. | planned |
| **Progress Check** | Two weeks later, it quizzes you on what the session covered. If you've drifted, it nudges a follow-up. Learning, not attendance, is the metric. | planned |

---

## Onboarding

Both roles start the same way — **sign up with your college email, verify the OTP, pick your year and branch.** That takes about a minute. From there the paths split, and either one can be added later: the same account can learn and mentor.

### 🎓 Junior — "I need help" · ~2 minutes

| # | Step | Why it's there |
|---|------|----------------|
| 1 | Pick topics you're learning — `C`, `Java`, `Docker`, `Git`… | Drives your feed and match quality |
| 2 | Type **one thing you're stuck on right now** | AI triage reads it and finds the real concept gap |
| 3 | See 3 suggested mentors, each with a reason | Instant proof the platform works |
| 4 | Book an open slot | You leave onboarding with a session, not a profile |

> The whole point: a junior should have a **booked session before they finish signing up**. No empty dashboard, no "explore around" dead end.

### 🧑‍🏫 Senior — "I can help" · ~10 minutes

| # | Step | Why it's there |
|---|------|----------------|
| 1 | Toggle **"I want to mentor"** | One switch, same account |
| 2 | Add topics you can teach | The claim — unverified for now |
| 3 | **SkillProof** — add your GitHub | AI reads your real code and turns the claim into a verified badge |
| 4 | Set your weekly availability (10 AM – 10 PM) | Without slots you're invisible in search |
| 5 | Done — you're listed and bookable | First request usually arrives same day |

> Step 3 is skippable; you just stay `Self-claimed` and rank lower than verified mentors. That's the nudge, not a wall. The adaptive viva that upgrades a badge to `High` confidence runs later from your profile — onboarding stays short on purpose.

### First-week nudges

- **Junior**, 2 days after the first session: *"Still stuck on Docker volumes? Aarav has a slot Thursday."*
- **Senior**, after 3 sessions: *"Your Mentor Twin is ready to train — stop answering the same question twice."*
- **Either**, if inactive for a week: one digest of unanswered doubts in their topics. Then it stops.

---

## Features

### 👤 Accounts & Profiles

- **Dual roles** — one account, both hats. A second-year can mentor in C and be mentored in DSA at the same time.
- **College email verification** — keeps the platform scoped to real students on real campuses.
- Profile: year, branch, college, bio, availability, languages spoken, mentoring style (patient explainer / fast tracker / project-based).
- **Verified skill badges** via SkillProof (see above) + self-declared "learning now" topics.
- Public mentor page with stats: sessions held, topics covered, average rating, response time.

### 🔍 Discovery & Matching

- **Subjects follow your branch.** A Civil student sees `Structural Analysis`, `Surveying`, `STAAD.Pro`, `Estimation & Costing` — not Kubernetes. Mechanical sees `Thermodynamics`, `SolidWorks`, `Theory of Machines`; Electrical sees `Electrical Machines`, `Power Systems`, `PLC & SCADA`; ECE sees `Embedded C`, `VLSI Design`, `Digital Signal Processing`. Ten branches ship with their own subject lists:

  | Branch | Sample subjects |
  |--------|-----------------|
  | CSE / IT | DSA, DBMS, Operating Systems, React, Docker, Machine Learning, Cybersecurity |
  | ECE | Analog & Digital Electronics, Signals & Systems, Embedded C, VLSI Design, Verilog, MATLAB |
  | Electrical | Electrical Machines, Power Systems, Power Electronics, Control Systems, ETAP, PLC & SCADA |
  | Mechanical | Thermodynamics, Heat Transfer, Machine Design, Manufacturing, SolidWorks, ANSYS |
  | Civil | Structural Analysis, Concrete Technology, Geotechnical, Surveying, STAAD.Pro, Revit |
  | Chemical | Mass Transfer, Reaction Engineering, Process Control, Aspen HYSYS |
  | Aerospace | Aerodynamics, Propulsion, Aircraft Structures, CFD, CATIA |
  | Automobile | IC Engines, Vehicle Dynamics, EV Technology, Automotive Electronics |
  | Biotech | Biochemistry, Genetic Engineering, Bioprocess Engineering, Bioinformatics |
  | Everyone | Engineering Mathematics, Engineering Drawing, GATE Prep, Placement Prep, Aptitude, Internships |

- **Cross-branch is one tap away** — the picker defaults to your branch but a single toggle opens every branch, because a Mechanical student who wants Python shouldn't hit a wall. Search spans whatever scope you're in, and if a search finds nothing in your branch it tells you how many matches exist elsewhere.
- Anything missing? **Type it and add it.** Custom subjects join the searchable list.
- **Top-rated mentors appear first.** Results are sorted by MentorScore by default, so the best mentors for a topic are the ones you see at the top of the page — no scrolling, no guessing.

```
Mentors for "Docker"                      Sort: ★ Top rated ▾

 1. Aarav S.    ★ 4.9 (32)   🐳 Verified · High    ● Online   [ Book ]
 2. Nisha R.    ★ 4.8 (27)   🐳 Verified · High    Next: Tue 7 PM
 3. Karan M.    ★ 4.6 (19)   🐳 Verified · Medium  Next: Wed 6 PM
 4. Priya T.    ★ 4.4 (11)   🐳 Verified · Medium  Next: Thu 8 PM
 5. Rohit K.    ★ 4.1 (6)    🐳 Self-claimed       Next: Fri 7 PM
```

- Other sorts available: **most sessions**, **fastest responder**, **available soonest**, **newest mentors** (so good newcomers aren't buried forever by the leaderboard).
- Ranking uses a **confidence-weighted average**, not a raw one — a mentor with 4.9★ across 30 sessions outranks one with a lone 5★ review.
- Filters: year, branch, verified-only, availability window, free vs. paid, minimum rating, language.
- **Smart Match** — describe your problem in a sentence, get a ranked mentor list with explanations.
- Browse by **learning track** (Web Dev, DevOps, Core CS, Placement Prep) rather than by individual topic.
- "Seniors from my college first" toggle — sometimes you want the person who took the same professor.

### 📅 Sessions

#### Mentor availability

Every mentor sets their own **weekly availability** — the hours they're actually free, per day. The system turns that into concrete bookable slots and hides anything already taken, so a junior never sees a slot they can't book.

```
Aarav S. · 🐳 Docker  🔧 Git  ☕ Java              ● Online now

  Mon 24        Tue 25        Wed 26        Thu 27
  ─────────     ─────────     ─────────     ─────────
  6:00 PM ✓     6:00 PM ✗     7:00 PM ✓     6:00 PM ✓
  7:00 PM ✓     7:00 PM ✓     8:00 PM ✓     7:00 PM ✗
  8:00 PM ✗     8:00 PM ✓                   8:00 PM ✓

  ✓ open   ✗ booked                    [ Book a slot ]
```

- Mentors define **recurring weekly availability** in one-hour blocks between **10 AM and 10 PM** (e.g. Mon–Fri, 6–9 PM) and can block one-off dates for exams or fests. Quick-fill presets — *weekday evenings*, *weekend mornings*, *after classes*, *late nights* — cover most people in one tap.
- Slot length follows the session type: quick doubt (15m), deep dive (45m), code review, project guidance.
- **Double-booking is impossible** — a slot is locked at the database level the moment it's confirmed.
- **Instant Help queue** for urgent blockers — no slot needed, mentors currently marked online get pinged directly.

#### Booking lifecycle

```
 Requested  →  Confirmed  →  In Progress  →  Completed  →  Rated
     │             │                             │
     └─ Declined   └─ Cancelled / Rescheduled    └─ No-show
```

- The junior picks a slot and writes what they're stuck on; the mentor accepts or declines with a reason.
- Both sides get reminders (in-app + email) 24 hours and 15 minutes before.
- At slot time the **session room** opens — a focused chat thread scoped to that one topic, with code blocks, screenshots, and shared links in one place.
- Either side can mark the session **complete**; the other confirms. That transition is what unlocks the rating form.
- Reschedule, cancel, and no-show handling with fair penalties on both sides — repeated no-shows drop your MentorScore and eventually your booking privileges.
- The session transcript is saved to both sides' notes vault — and it's what feeds the AI recap and the Mentor Twin.

### 💬 Communication

- Real-time **1:1 chat** — the core of the platform. Code blocks with syntax highlighting, file and screenshot sharing, typing indicators, read receipts.
- **Online / offline presence** so you know whether a mentor can reply right now.
- **Async doubt threads** — post a question, get answers over hours, no scheduling needed.
- **Topic rooms** — public channels per subject where anyone can jump in. Best answers get pinned.
- Notifications: in-app, email, and push for booking confirmations, escalations, and reminders.

### 📈 Progress & Growth

- **Learning dashboard** — topics started, topics completed, sessions attended, streaks.
- **Skill journey** — watch a topic move from `Learning` → `Comfortable` → `Verified` as you clear checkpoints.
- Personal **notes vault** — every session recap, snippet, and resource in one searchable place.
- Practice tasks assigned by mentors or generated by AI, with submission and feedback.

### ⭐ Trust & Reputation

#### Rate after every session

The rating form appears **only once a session is marked complete** — you can't review a mentor you never actually met, which keeps the scores honest.

```
How did your Docker session with Aarav go?

  Clarity        ★ ★ ★ ★ ★
  Patience       ★ ★ ★ ★ ☆
  Helpfulness    ★ ★ ★ ★ ★

  Did this actually unblock you?     ( Yes )  ( Partly )  ( No )

  Write a review (optional)
  ┌────────────────────────────────────────────┐
  │ Explained volumes with a diagram, then made │
  │ me fix the compose file myself. Finally     │
  │ clicked.                                    │
  └────────────────────────────────────────────┘

                              [ Submit rating ]
```

- **Three dimensions, not one star** — clarity, patience, and helpfulness, because "4 stars" tells a junior nothing about *why*.
- The **"did this unblock you?"** answer is the signal that actually matters, and it feeds match ranking.
- **Mutual and blind** — mentors rate juniors too (prepared? showed up? followed through?), and neither side sees the other's rating until both submit or 7 days pass. No revenge reviews.
- **One rating per session**, editable for 24 hours, then locked. Reviews are public on the mentor's profile with the topic attached.
- **MentorScore** — a composite of verified skills, session count, ratings, response time, and follow-through. Not just a star average.
- Public badges: `Top Mentor`, `100 Sessions`, `Fastest Responder`, `Docker Verified`, `DSA Specialist`.
- **Report & moderation** flow with review queue. Repeat offenders lose mentoring privileges.

### 🎓 Community & Campus

- **Leaderboards** — per college and platform-wide, for mentors and learners.
- **Study groups** — 3–6 juniors + 1 senior on a shared topic, cheaper per head and often more fun.
- **Resource library** — community-curated notes, cheatsheets, and roadmaps per topic, upvoted.
- **Campus admin dashboard** — colleges can onboard in bulk, see engagement, and recognize top mentors formally.

### 💰 Incentives

- Free-by-default: most sessions are peer-to-peer and free.
- Optional **paid sessions** for in-depth mentoring, with escrow and payout to the mentor.
- **Credit system** — mentor others to earn credits, spend them on your own sessions. Keeps the loop self-sustaining.
- Verified certificates for mentors that colleges can count toward activity points.

---

## Tech Stack

> ⚠️ **Status:** MentorMatch is in early development. The stack below is the planned architecture — implementation is in progress.

One codebase, one database, one deploy. Next.js handles both the UI and the API (route handlers + server actions), so there's no separate Express server to run, host, or keep in sync.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router)** | Frontend + backend in one project — one repo, one deploy |
| Language | TypeScript | Catches the dumb bugs before the demo |
| Styling | Tailwind CSS + shadcn/ui | Good-looking UI without designing anything from scratch |
| Database | **PostgreSQL** (Neon / Supabase) | Relational data — users, skills, sessions, reviews all link together |
| ORM | Prisma | Schema in one file, typed queries, easy migrations |
| Auth | NextAuth (Auth.js) — Google + college email OTP | Login in an afternoon instead of a week |
| Realtime chat | **Supabase Realtime** *(or Pusher)* | Live messages + presence without running a WebSocket server |
| AI | **Google Gemini API** | Generous free tier, fast, great for a student project |
| Vector search | `pgvector` on the same Postgres | Semantic skill graph — no extra vector DB to manage |
| File storage | UploadThing / Cloudinary | Avatars, screenshots, shared files |
| Email | Resend | OTP + session reminders |
| Hosting | Vercel + Neon | Both free tiers, deploys on `git push` |

### Why this stack

- **Postgres over MongoDB** — this app is *all* relationships (a user has skills, a skill has sessions, a session has a review, a review affects MentorScore). SQL joins make that trivial; in Mongo you'd hand-roll it.
- **Next.js over React + Express** — half the config, half the deploy steps, and `/api` routes live next to the pages that call them. For a college project, fewer moving parts is the whole game.
- **Gemini over anything self-hosted** — free tier covers development and a demo easily, one API key, and a flash model is fast enough for live doubt triage.
- **Chat-only, by design** — no video calls. Real-time text is genuinely enough for "why is my Docker container exiting immediately", it keeps a searchable transcript the AI can learn from, and it works on a hostel wifi connection that can't hold a video stream. Building WebRTC is where semester projects go to die.
- **Hosted realtime over Socket.IO** — Socket.IO needs a long-running server, which doesn't fit Vercel's serverless model. A hosted channel gives you live messages with zero infra.

**Model usage plan (Gemini):**

| Task | Model | Reason | Status |
|---|---|---|---|
| Doubt triage & routing | `gemini-3.5-flash` | High volume, needs to feel instant, cheap | ✅ wired — `/api/triage` |
| Session recaps & practice tasks | `gemini-3.5-flash` | Structured JSON output, runs after every session | ✅ wired — `/api/recap` |
| SkillProof code analysis & viva | a pro model | Long repo context, deeper reasoning | mock (`analyseRepos`) |
| Mentor Twin responses | a pro model | Quality matters — it's speaking as a mentor | not started |
| Semantic skill graph | `gemini-embedding-001` | Embeddings for mentor/topic similarity search | not started |

> Check the [current Gemini model list](https://ai.google.dev/gemini-api/docs/models) before wiring these up — Google rotates model IDs faster than this README updates. `src/lib/ai/gemini.ts` takes a model chain for that reason: it tries `GEMINI_MODEL`, then `gemini-3.5-flash`, then `gemini-3.1-flash-lite`, and moves on when one answers 404 or 503.

**How the AI is called.** No SDK — `src/lib/ai/gemini.ts` posts to `v1beta/models/{model}:generateContent` with plain `fetch`, using `responseMimeType: "application/json"` + `responseSchema` so every answer arrives as typed JSON, and a 20-second `AbortSignal.timeout`. The key is read **only** inside route handlers under `src/app/api/`, never with a `NEXT_PUBLIC_` prefix, so it cannot reach the browser bundle.

**It always answers.** `/api/triage` and `/api/recap` fall back to a deterministic keyword table (`runTriage`) and an offline recap when there's no key, no network, or the model is busy. The response carries a `source` field — `"ai"` or `"rules"`/`"offline"` — and the UI says which one you got rather than pretending. Mentor ranking is never the model's job: `rankMentors()` sorts on real skills, branch and ratings whichever side named the topic.

---

## Getting Started

### Prerequisites

- **Node.js 20+**
- A **PostgreSQL** database — easiest is a free [Neon](https://neon.tech) project (no local install needed)
- A free [Gemini API key](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/adnik-2065/MentorMatch.git
cd MentorMatch
npm install
npm run dev
```

Open [localhost:3000/onboarding](http://localhost:3000/onboarding) — **the onboarding dashboard is built and clickable end to end.** It runs on mock data, so no database is needed yet; everything below is for when you wire up the backend.

Doubt triage and session recaps are the one part that does call a real API. Drop a `GEMINI_API_KEY` in `.env.local` (see [Environment](#environment)) and they go through Gemini; leave it out and they fall back to an offline keyword table, so nothing breaks without one.

### Accounts and dashboards

Finishing onboarding creates your account in the browser (`localStorage`, key `mentormatch.profile.v1`) and drops you on `/dashboard` (junior) or `/mentor` (senior). Those pages show **your** data — the name you typed, the subjects you picked, the slots you published, the slot you asked a senior for. Nothing is pre-filled for you; sections you haven't used yet show an empty state with the action that fills them.

[localhost:3000/signin](http://localhost:3000/signin) is the switcher:

| Card | What it opens |
|---|---|
| **Your account** | Your stored onboarding profile — only appears once you've finished onboarding |
| **Aditya N.** — 2nd Year Civil | Sample junior: booked sessions, a session to rate, AI recaps |
| **Meera J.** — 4th Year Civil | Sample senior: pending requests, a published week, MentorScore |

The sample accounts exist so the dashboards can be demoed with a full week of data, but they are **only** rendered while you're signed into one of them — they carry a `Sample account` badge in the header, and `Switch` returns you to the picker. Real profiles never mix with sample data (`src/lib/account.ts` builds a view from one or the other, never both).

### Asking, booking and chat

`/ask`, `/book` and `/chat` are in the header of every dashboard page.

**Asking a doubt** — `/ask` is the route that needs nobody's calendar. Pick one subject (your own first, *Something else* opens the rest of your branch), write the question, optionally run the same triage to name the concept gap, and post it. There's no slot to hold and nothing to accept, so the room opens immediately and the doubt goes to every senior who claims that subject rather than to one person — the composer says *your seniors* until somebody picks it up. It shows under *Doubts you've asked* on your dashboard with a *Withdraw* button. In the sample account you're Meera on the mentoring side, so a doubt in a subject she claims also appears in *Open doubts in your subjects* on `/mentor`; routing it to anybody else is a server job.

**Booking** — search a subject, a branch or a name, then ask for one of the slots that mentor published. Mentors in your subjects and your branch come first, then by rating. Optionally describe what you're stuck on and hit *Find the concept gap* to run the same triage onboarding uses; the concept rides along with the request.

**Triage** — onboarding, `/ask` and `/book` all call `POST /api/triage`, which asks Gemini to name the subject, the concept gap under the symptom and three or four related concepts to read next. The model must pick the subject from your own list and the rest of your branch, so a Civil doubt can't surface a Kubernetes senior; if it picks anything else the answer is thrown away and the keyword table answers instead. The card says which one you got.

**Asking is not booking.** A slot you take starts as `pending` — including the one you pick during onboarding, which goes into the same store as every other. It lands on your dashboard marked *Awaiting <mentor> confirmation*, holds the slot so nobody else can take it, and gives you a *Withdraw* button — but no chat, because there's nobody on the other side yet. It reaches the mentor as a request. Accepting flips it to `confirmed` and that is what opens the room; declining releases the slot.

Two ways to see the other half of that, since no server can deliver a reply yet:

- **Sample account** — you're Meera on the mentoring side, so slots you take from her land in your own *Session requests* inbox. Accept one there and the room appears. This is the real flow.
- **Your own account** — the pending card carries an *Accept as \<mentor\>* button, labelled as the stand-in it is. It calls the same `acceptBooking()` the inbox does.

**Chat** — one room per *accepted* session and one per doubt, listed for both hats at once (`Learning` / `Mentoring`). Session rooms open before the slot and stay open after it; doubt rooms are open from the moment you post. A doubt you asked is one room, not two, even in the sample account where you're on both ends of it. `Enter` sends, `Shift+Enter` breaks the line, and the room deep-links as `/chat?s=<session or doubt id>`.

**Recaps** — *Your notes vault* on `/dashboard` lists every room that's finished without a write-up: a session waiting to be rated, and any doubt you've asked. *Generate recap* sends the topic, the concept and whatever was actually typed in that room to `POST /api/recap`, which returns a title, two to four things you covered and two or three practice tasks. The tasks are checkboxes and they drive the progress bar; regenerating replaces that room's recap rather than stacking a second copy. An empty room still works — the model writes the practice for the concept instead of inventing a conversation.

All of it is per account, in `localStorage`: bookings under `mentormatch.bookings.v1`, doubts under `mentormatch.doubts.v1`, messages under `mentormatch.chat.v1`, recaps under `mentormatch.recaps.v1`, each keyed by `me` or `demo`. Asking, booking or chatting inside the sample account never touches your own, and your own rooms start with a single system line — the seeded transcripts belong to the sample account only.

### Environment

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/mentormatch?sslmode=require"

# Auth
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI — the only key that does anything today. Read server-side only, in
# src/app/api/**; never give it a NEXT_PUBLIC_ prefix. Without it, triage and
# recaps quietly fall back to the offline keyword table.
GEMINI_API_KEY="your_key_here"
GEMINI_MODEL="gemini-3.5-flash"   # optional — first in the fallback chain

# Optional — add as you build these features
RESEND_API_KEY=""
UPLOADTHING_TOKEN=""
GITHUB_TOKEN=""          # for SkillProof repo analysis
```

### Database setup

```bash
npx prisma generate
npx prisma db push       # or: npx prisma migrate dev
npx prisma studio        # optional — browse your data in the browser
```

### Run

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Project Structure

```
MentorMatch/
├── prisma/
│   └── schema.prisma          # User, Skill, SkillProof, Availability, Slot,
│                              # Session, Review, DoubtThread, Message
├── src/
│   ├── app/
│   │   ├── onboarding/        # ✅ built — the onboarding dashboard
│   │   ├── signin/            # ✅ built — your account, or a sample one
│   │   ├── dashboard/         # ✅ built — student: sessions, ratings, recaps
│   │   ├── mentor/            # ✅ built — mentor: requests, schedule, score
│   │   ├── ask/               # ✅ built — post a doubt, no slot needed
│   │   ├── book/              # ✅ built — mentor search + slot requests
│   │   ├── chat/              # ✅ built — one room per session or doubt
│   │   ├── (auth)/            # login, signup, verify college email
│   │   ├── (main)/
│   │   │   ├── discover/      # topic search + Smart Match
│   │   │   ├── mentor/[id]/   # public mentor profile + badges
│   │   │   ├── availability/  # mentor sets their weekly slots
│   │   │   ├── sessions/      # bookings, calendar, session room
│   │   │   └── doubts/        # async doubt threads
│   │   └── api/
│   │       ├── triage/        # ✅ built — doubt in, concept gap out
│   │       ├── recap/         # ✅ built — session in, recap + next steps out
│   │       ├── auth/          # NextAuth handler
│   │       ├── skillproof/    # GitHub analysis + viva
│   │       └── twin/          # Mentor Twin chat
│   ├── components/
│   │   ├── ui.tsx             # ✅ Button, Input, Chip, Card, Badge…
│   │   ├── SignIn.tsx         # ✅ account picker — yours or a sample one
│   │   ├── onboarding/        # ✅ ProgressRail + one file per step group
│   │   ├── dashboard/         # ✅ Shell, SessionCard, RequestInbox, recaps
│   │   ├── booking/           # ✅ mentor search, slot picker, confirmation
│   │   ├── doubt/             # ✅ subject picker, triage, ask form
│   │   ├── triage/            # ✅ the concept-gap card, shared by all three
│   │   └── chat/              # ✅ room list, transcript, composer
│   ├── lib/
│   │   ├── onboarding.ts      # ✅ branch subjects, mock mentors, offline triage
│   │   ├── account.ts         # ✅ stored profile → dashboard view (or sample)
│   │   ├── dashboard.ts       # ✅ sample sessions, requests, doubts, recaps
│   │   ├── bookings.ts        # ✅ per-account booking store + slot conflicts
│   │   ├── doubts.ts          # ✅ per-account asked-doubt store + age labels
│   │   ├── recaps.ts          # ✅ per-account recap store + practice ticks
│   │   ├── chat.ts            # ✅ threads from sessions and doubts + messages
│   │   ├── triage-client.ts   # ✅ browser → the two API routes, with fallback
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   └── ai/                # server only — the key never leaves this folder
│   │       ├── gemini.ts      # ✅ fetch + JSON schema + model fallback chain
│   │       ├── triage.ts      # ✅ concept gap from a doubt
│   │       ├── recap.ts       # ✅ recap + next steps from a room
│   │       ├── skillproof.ts
│   │       └── twin.ts
│   └── types/
└── README.md
```

---

## Roadmap

**Phase 1 — Foundation**
- [x] Next.js + TypeScript + Tailwind scaffold
- [x] Onboarding dashboard (both roles, mock data)
- [x] Branch-specific subject lists for 10 engineering branches
- [x] Student and mentor dashboards, driven by your own onboarding profile
- [x] Account switcher with two sample accounts for demos
- [ ] Prisma schema + database setup
- [ ] Auth + college email verification
- [ ] Profiles with self-declared skills
- [ ] Topic search and mentor discovery, sorted by rating
- [x] Mentor search + slot requests, accepted or declined by the mentor (`/book`, mock data)
- [ ] Mentor availability + slot booking, server side

**Phase 2 — Core Loop**
- [x] Session rooms with a working composer, opened by the mentor accepting (`/chat`, mock data)
- [x] Async doubts — asked without booking, routed by subject (`/ask`, mock data)
- [ ] Real-time chat + presence
- [ ] Async doubt threads, server side
- [ ] Post-session ratings, reviews, MentorScore
- [x] Session recaps and practice tasks (AI) — `/api/recap`, stored per account

**Phase 3 — The AI Kick**
- [x] Doubt triage — `/api/triage`, Gemini with an offline fallback
- [ ] Smart Match beyond skill + rating sorting
- [ ] SkillProof: GitHub analysis + adaptive viva + badges
- [ ] Semantic skill graph (`pgvector` + embeddings)
- [ ] Mentor Twin (opt-in, with escalation)

**Phase 4 — Scale**
- [ ] Study groups
- [ ] Campus admin dashboards
- [ ] Credit system and paid sessions
- [ ] Mobile app

### Building this as a semester project?

The whole feature list is the long-term vision, not a checklist for one semester. A demo that actually lands needs only this slice:

**Auth → profiles with skills → topic search sorted by rating → availability + booking → chat → post-session ratings → SkillProof badges → doubt triage.**

That's a complete, working loop *and* it shows off the AI differentiator. The Mentor Twin, credits, study groups, and campus dashboards are all safe to leave for "future scope" — nobody has ever lost marks for a clean, finished core.

---

## Contributing

Contributions are welcome — especially from students who've lived this problem.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

Please keep PRs focused, and open an issue first for anything large.

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">Built so no junior has to stay stuck, and no senior has to answer the same question twice.</p>

import type { Pool, PoolClient } from "pg";
import { DAYS, HOURS, type Mentor, type MentorExperience } from "@/lib/onboarding";
import { companyKey, positionKey } from "@/lib/placement";
import type { ProfileInput } from "@/lib/profileValidation";

export type StoredProfile = ProfileInput & { id: string; updatedAt: string };

/** Everything the API needs from persistence — swapped for an in-memory fake in tests. */
export interface ProfileStore {
  findByOwner(ownerHash: string): Promise<StoredProfile | null>;
  saveForOwner(ownerHash: string, input: ProfileInput): Promise<StoredProfile>;
  /** Public mentor listing: bookable mentors only, no college or owner data. */
  listMentors(): Promise<Mentor[]>;
}

/* --------------------------------- mapping ---------------------------------- */

/** "Aarav Sharma" → "Aarav S." — the same shape the sample profiles use. */
export function publicName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function slotsFrom(availability: Record<string, string[]>) {
  return DAYS.flatMap((day) =>
    HOURS.filter((hour) => availability[day]?.includes(hour)).map((time) => ({ day, time })),
  );
}

type ExperienceRow = {
  company: string | null;
  position: string | null;
  kind: MentorExperience["kind"] | null;
  startYear: number | null;
  endYear: number | null;
  verification: "self_reported" | "verified";
};

function toExperience(rows: ExperienceRow[] | null): MentorExperience[] {
  return (rows ?? []).map((row) => ({
    company: row.company,
    position: row.position,
    ...(row.kind ? { kind: row.kind } : {}),
    startYear: row.startYear,
    endYear: row.endYear,
    verification: row.verification === "verified" ? "verified" : "self-reported",
  }));
}

const EXPERIENCE_JSON = `
  coalesce((
    select json_agg(json_build_object(
      'company', e.company, 'position', e.position, 'kind', e.kind,
      'startYear', e.start_year, 'endYear', e.end_year, 'verification', e.verification
    ) order by e.sort_order)
    from mentor_experience e where e.profile_id = p.id
  ), '[]'::json)`;

/* ---------------------------------- queries --------------------------------- */

type Queryable = Pick<PoolClient, "query">;

async function findByOwner(db: Queryable, ownerHash: string): Promise<StoredProfile | null> {
  const { rows } = await db.query(
    `select p.id, p.role, p.name, p.college, p.year, p.branch, p.learn_topics, p.teach_topics,
            p.placement_season, p.availability, p.updated_at,
            coalesce((select array_agg(t.label order by t.sort_order) from placement_targets t
                      where t.profile_id = p.id and t.kind = 'company'), '{}') as target_companies,
            coalesce((select array_agg(t.label order by t.sort_order) from placement_targets t
                      where t.profile_id = p.id and t.kind = 'position'), '{}') as target_positions,
            ${EXPERIENCE_JSON} as experience
       from profiles p
      where p.owner_token_hash = $1`,
    [ownerHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    college: row.college,
    year: row.year,
    branch: row.branch,
    learnTopics: row.learn_topics,
    teachTopics: row.teach_topics,
    targetCompanies: row.target_companies,
    targetRoles: row.target_positions,
    placementSeason: row.placement_season,
    availability: row.availability,
    experience: toExperience(row.experience),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** One entry per match key, so "SDE" and "Software Engineer" can't both be stored. */
function dedupeByKey(labels: string[], key: (value: string) => string) {
  const seen = new Map<string, string>();
  for (const label of labels) {
    const k = key(label);
    if (k && !seen.has(k)) seen.set(k, label);
  }
  return [...seen.entries()];
}

async function replaceTargets(db: Queryable, profileId: string, kind: "company" | "position", labels: string[]) {
  const entries = dedupeByKey(labels, kind === "company" ? companyKey : positionKey);
  if (entries.length === 0) return;
  await db.query(
    `insert into placement_targets (profile_id, kind, label, match_key, sort_order)
     select $1, $2, label, match_key, ord - 1
       from unnest($3::text[], $4::text[]) with ordinality as t(label, match_key, ord)`,
    [profileId, kind, entries.map(([, label]) => label), entries.map(([key]) => key)],
  );
}

async function saveForOwner(pool: Pool, ownerHash: string, input: ProfileInput): Promise<StoredProfile> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into profiles (owner_token_hash, role, name, college, year, branch, learn_topics,
                             teach_topics, placement_season, availability)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (owner_token_hash) do update set
         role = excluded.role, name = excluded.name, college = excluded.college,
         year = excluded.year, branch = excluded.branch, learn_topics = excluded.learn_topics,
         teach_topics = excluded.teach_topics, placement_season = excluded.placement_season,
         availability = excluded.availability, updated_at = now()
       returning id`,
      [
        ownerHash,
        input.role,
        input.name,
        input.college,
        input.year,
        input.branch,
        input.learnTopics,
        input.teachTopics,
        input.placementSeason,
        JSON.stringify(input.availability),
      ],
    );
    const profileId: string = rows[0].id;

    await client.query("delete from placement_targets where profile_id = $1", [profileId]);
    await replaceTargets(client, profileId, "company", input.targetCompanies);
    await replaceTargets(client, profileId, "position", input.targetRoles);

    await client.query("delete from mentor_experience where profile_id = $1", [profileId]);
    for (const [index, entry] of input.experience.entries()) {
      await client.query(
        `insert into mentor_experience (profile_id, company, company_key, position, position_key,
                                        kind, start_year, end_year, verification, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'self_reported', $9)`,
        [
          profileId,
          entry.company,
          entry.company ? companyKey(entry.company) : null,
          entry.position,
          entry.position ? positionKey(entry.position) : null,
          entry.kind ?? null,
          entry.startYear ?? null,
          entry.endYear ?? null,
          index,
        ],
      );
    }

    const saved = await findByOwner(client, ownerHash);
    await client.query("commit");
    return saved!;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function listMentors(db: Queryable): Promise<Mentor[]> {
  const { rows } = await db.query(
    `select p.id, p.name, p.year, p.branch, p.teach_topics, p.availability, ${EXPERIENCE_JSON} as experience
       from profiles p
      where p.role = 'mentor' and cardinality(p.teach_topics) > 0
      order by p.updated_at desc
      limit 200`,
  );
  return rows
    .map(
      (row): Mentor => ({
        id: row.id,
        name: publicName(row.name),
        year: row.year,
        branch: row.branch,
        // No sessions yet — new mentors aren't given a rating they haven't earned.
        rating: 0,
        reviews: 0,
        skills: row.teach_topics,
        experience: toExperience(row.experience),
        // SkillProof is still a mock, so registered mentors stay self-claimed.
        verified: "claimed",
        online: false,
        slots: slotsFrom(row.availability ?? {}),
        source: "registered",
      }),
    )
    .filter((mentor) => mentor.slots.length > 0);
}

export function pgProfileStore(pool: Pool): ProfileStore {
  return {
    findByOwner: (ownerHash) => findByOwner(pool, ownerHash),
    saveForOwner: (ownerHash, input) => saveForOwner(pool, ownerHash, input),
    listMentors: () => listMentors(pool),
  };
}

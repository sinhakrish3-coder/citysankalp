// ─────────────────────────────────────────────────────────────
//  lib/utils/mappers.ts
//  Converts raw Supabase row objects into the domain types that
//  the existing UI components already expect.  Zero UI changes
//  required because the output shapes are identical to the old
//  mock objects in lib/issues.ts and lib/civic-data.ts.
// ─────────────────────────────────────────────────────────────
import { timeAgo, daysLeft } from '@/lib/utils/timeAgo'
import type {
  IssueRow, FeedPostRow, CompetitionRow, RewardRow, ProfileRow,
} from '@/lib/database.types'

// ── Issue ─────────────────────────────────────────────────────
// Matches the `Issue` type in lib/issues.ts exactly.
export function mapIssue(row: IssueRow) {
  return {
    id:           row.id,
    title:        row.title,
    summary:      row.summary,
    category:     row.category,
    status:       row.status,
    distance:     row.display_distance,
    locality:     row.locality,
    timeAgo:      timeAgo(row.created_at),
    amplifies:    row.amplifies_count,
    thumbnail:    row.thumbnail_url   ?? '/placeholder.svg',
    thumbnailAlt: row.thumbnail_alt   ?? row.title,
    reportedBy:   row.reporter_name,
    reporterVerified: row.reporter_verified,
    petition: {
      signatures: row.petition_signatures,
      goal:       row.petition_goal,
    },
    restricted: row.restricted,
    responder: row.responder_name
      ? {
          name:     row.responder_name,
          type:     row.responder_type!,
          verified: row.responder_verified,
        }
      : undefined,
    // Raw fields – used by detail sheet for realtime state sync
    _amplifies_count:     row.amplifies_count,
    _petition_signatures: row.petition_signatures,
  } as const
}
export type MappedIssue = ReturnType<typeof mapIssue>

// ── Feed Post ─────────────────────────────────────────────────
// Matches the `FeedPost` union in lib/civic-data.ts.
export function mapFeedPost(row: FeedPostRow) {
  const base = {
    id:       row.id,
    author:   row.author_name,
    handle:   row.author_handle,
    avatar:   row.author_avatar_url ?? '/placeholder.svg',
    timeAgo:  timeAgo(row.created_at),
    likes:    row.likes_count,
    comments: row.comments_count,
  }

  if (row.type === 'before-after') {
    return {
      ...base,
      type:        'before-after' as const,
      title:       row.title       ?? '',
      body:        row.body,
      beforeImage: row.before_image_url ?? '/placeholder.svg',
      afterImage:  row.after_image_url  ?? '/placeholder.svg',
    }
  }
  return {
    ...base,
    type:     'update' as const,
    body:     row.body,
    image:    row.image_url  ?? '/placeholder.svg',
    imageAlt: row.image_alt  ?? '',
  }
}
export type MappedFeedPost = ReturnType<typeof mapFeedPost>

// ── Competition ───────────────────────────────────────────────
export function mapCompetition(row: CompetitionRow) {
  return {
    id:           row.id,
    title:        row.title,
    sponsor:      row.sponsor,
    image:        row.image_url ?? '/placeholder.svg',
    points:       row.points,
    participants: row.participants_count,
    daysLeft:     daysLeft(row.ends_at),
  }
}
export type MappedCompetition = ReturnType<typeof mapCompetition>

// ── Reward ────────────────────────────────────────────────────
export function mapReward(row: RewardRow) {
  return {
    id:   row.id,
    name: row.name,
    cost: row.cost,
    icon: row.icon as 'coffee' | 'ticket' | 'leaf' | 'gift' | 'shirt',
  }
}
export type MappedReward = ReturnType<typeof mapReward>

// ── Profile ───────────────────────────────────────────────────
export function mapProfile(row: ProfileRow) {
  return {
    name:        row.display_name ?? 'Citizen',
    handle:      row.handle ?? `@user_${row.id.slice(0, 6)}`,
    avatar:      row.avatar_url ?? '/avatars/user.png',
    tier:        row.tier_label,
    meritScore:  row.merit_score,
    nextTierAt:  row.next_tier_at,
    stats: {
      reported:  row.reports_count,
      amplified: row.amplifies_count,
      resolved:  row.resolved_count,
    },
  }
}
export type MappedProfile = ReturnType<typeof mapProfile>

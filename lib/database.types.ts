// ─────────────────────────────────────────────────────────────
//  CitySankalp – Database types
//  These mirror every table column in supabase/schema.sql.
//  Tip: once your schema is stable, replace with the auto-
//  generated output of `supabase gen types typescript`.
// ─────────────────────────────────────────────────────────────

// ── Shared primitives ─────────────────────────────────────────
export type IssueCategory = 'Road' | 'Cleanliness' | 'Water' | 'Lighting' | 'Safety' | 'Parks'
export type IssueStatus   = 'Open' | 'Verified' | 'NGO Claimed' | 'In Progress' | 'Gov Jurisdiction'
export type ResponderType = 'NGO' | 'Company' | 'Citizen Group' | 'Government'
export type FeedPostType  = 'before-after' | 'update'
export type RewardIcon    = 'coffee' | 'ticket' | 'leaf' | 'gift' | 'shirt'
export type ClaimStatus   = 'pending' | 'approved' | 'rejected' | 'completed'

// ── Row shapes (match DB columns 1-to-1) ──────────────────────
export interface ProfileRow {
  id:              string
  display_name:    string
  handle:          string | null
  avatar_url:      string | null
  merit_score:     number
  tier_level:      number
  tier_label:      string
  next_tier_at:    number
  reports_count:   number
  amplifies_count: number
  resolved_count:  number
  is_verified:     boolean
  responder_type:  ResponderType | null
  created_at:      string
  updated_at:      string
}

export interface IssueRow {
  id:                  string
  title:               string
  summary:             string
  category:            IssueCategory
  status:              IssueStatus
  locality:            string
  latitude:            number | null
  longitude:           number | null
  display_distance:    string
  thumbnail_url:       string | null
  thumbnail_alt:       string | null
  reported_by_id:      string | null
  reporter_name:       string
  reporter_verified:   boolean
  amplifies_count:     number
  petition_signatures: number
  petition_goal:       number
  restricted:          boolean
  responder_name:      string | null
  responder_type:      ResponderType | null
  responder_verified:  boolean
  created_at:          string
  updated_at:          string
}

export interface FeedPostRow {
  id:                string
  type:              FeedPostType
  author_id:         string | null
  author_name:       string
  author_handle:     string
  author_avatar_url: string | null
  title:             string | null
  body:              string
  image_url:         string | null
  image_alt:         string | null
  before_image_url:  string | null
  after_image_url:   string | null
  likes_count:       number
  comments_count:    number
  related_issue_id:  string | null
  created_at:        string
}

export interface CompetitionRow {
  id:                 string
  title:              string
  sponsor:            string
  image_url:          string | null
  points:             number
  participants_count: number
  ends_at:            string
  is_active:          boolean
  created_at:         string
}

export interface RewardRow {
  id:           string
  name:         string
  cost:         number
  icon:         string
  quantity:     number | null
  is_available: boolean
  created_at:   string
}

export interface AmplificationRow {
  id:         string
  issue_id:   string
  user_id:    string
  created_at: string
}

export interface PetitionSignatureRow {
  id:         string
  issue_id:   string
  user_id:    string
  created_at: string
}

export interface FeedLikeRow {
  id:         string
  post_id:    string
  user_id:    string
  created_at: string
}

export interface IssueClaimRow {
  id:          string
  issue_id:    string
  claimer_id:  string
  status:      ClaimStatus
  notes:       string | null
  claimed_at:  string
  resolved_at: string | null
}

export interface CompetitionParticipantRow {
  id:             string
  competition_id: string
  user_id:        string
  joined_at:      string
}

export interface MeritTransactionRow {
  id:           string
  user_id:      string
  points:       number
  action_type:  string
  reference_id: string | null
  description:  string | null
  created_at:   string
}

export interface FeedCommentRow {
  id:         string
  post_id:    string
  user_id:    string
  body:       string
  created_at: string
}

export interface NotificationRow {
  id:         string
  user_id:    string
  title:      string
  body:       string
  type:       string
  is_read:    boolean
  created_at: string
}

export interface RewardClaimRow {
  id:         string
  reward_id:  string
  user_id:    string
  merit_cost: number
  status:     string
  claimed_at: string
}

// ── Database namespace (for createClient<Database>()) ─────────
// Conforms to the exact generic shape the Supabase JS client expects so that
// .from(...).insert(...) etc. resolve to real types instead of `never[]`.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row:    ProfileRow
        Insert: Partial<ProfileRow> & { id: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      issues: {
        Row:    IssueRow
        Insert: Partial<Omit<IssueRow, 'id' | 'created_at' | 'updated_at'>> & { title: string; summary: string; category: IssueCategory; status: IssueStatus; locality: string; reporter_name: string }
        Update: Partial<Omit<IssueRow, 'id' | 'created_at'>>
        Relationships: []
      }
      feed_posts: {
        Row:    FeedPostRow
        Insert: Partial<Omit<FeedPostRow, 'id' | 'created_at'>> & { type: FeedPostType; author_name: string; author_handle: string; body: string }
        Update: Partial<Omit<FeedPostRow, 'id' | 'created_at'>>
        Relationships: []
      }
      amplifications: {
        Row:    AmplificationRow
        Insert: { issue_id: string; user_id: string }
        Update: Partial<AmplificationRow>
        Relationships: []
      }
      petition_signatures: {
        Row:    PetitionSignatureRow
        Insert: { issue_id: string; user_id: string }
        Update: Partial<PetitionSignatureRow>
        Relationships: []
      }
      feed_likes: {
        Row:    FeedLikeRow
        Insert: { post_id: string; user_id: string }
        Update: Partial<FeedLikeRow>
        Relationships: []
      }
      competitions: {
        Row:    CompetitionRow
        Insert: Partial<Omit<CompetitionRow, 'id' | 'created_at'>> & { title: string; sponsor: string; points: number; ends_at: string }
        Update: Partial<Omit<CompetitionRow, 'id' | 'created_at'>>
        Relationships: []
      }
      competition_participants: {
        Row:    CompetitionParticipantRow
        Insert: { competition_id: string; user_id: string }
        Update: Partial<CompetitionParticipantRow>
        Relationships: []
      }
      rewards: {
        Row:    RewardRow
        Insert: Partial<Omit<RewardRow, 'id' | 'created_at'>> & { name: string; cost: number; icon: string }
        Update: Partial<Omit<RewardRow, 'id' | 'created_at'>>
        Relationships: []
      }
      issue_claims: {
        Row:    IssueClaimRow
        Insert: { issue_id: string; claimer_id: string; status: ClaimStatus; notes?: string | null }
        Update: Partial<IssueClaimRow>
        Relationships: []
      }
      merit_transactions: {
        Row:    MeritTransactionRow
        Insert: Omit<MeritTransactionRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      feed_comments: {
        Row:    FeedCommentRow
        Insert: { post_id: string; user_id: string; body: string }
        Update: Partial<FeedCommentRow>
        Relationships: []
      }
      notifications: {
        Row:    NotificationRow
        Insert: Omit<NotificationRow, 'id' | 'created_at'>
        Update: Partial<NotificationRow>
        Relationships: []
      }
      reward_claims: {
        Row:    RewardClaimRow
        Insert: { reward_id: string; user_id: string; merit_cost: number; status: string }
        Update: Partial<RewardClaimRow>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recommend_issues: {
        Args: {
          p_user_id: string | null
          p_lat: number
          p_lon: number
          p_limit?: number
        }
        Returns: IssueRow[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


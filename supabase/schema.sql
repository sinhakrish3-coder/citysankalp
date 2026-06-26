-- =============================================================
--  CitySankalp – Full Database Schema
--  Run ONCE in Supabase → SQL Editor → New Query
-- =============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Uncomment if PostGIS is enabled on your Supabase plan (Pro+)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================
--  PROFILES  (extends auth.users 1-to-1)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT        NOT NULL DEFAULT 'Citizen',
  handle          TEXT        UNIQUE,
  avatar_url      TEXT,
  -- Merit / Gamification
  merit_score     INTEGER     NOT NULL DEFAULT 0   CHECK (merit_score >= 0),
  tier_level      INTEGER     NOT NULL DEFAULT 1,
  tier_label      TEXT        NOT NULL DEFAULT 'Level 1 · New Citizen',
  next_tier_at    INTEGER     NOT NULL DEFAULT 500,
  -- Activity counters (denormalised for fast reads)
  reports_count   INTEGER     NOT NULL DEFAULT 0,
  amplifies_count INTEGER     NOT NULL DEFAULT 0,
  resolved_count  INTEGER     NOT NULL DEFAULT 0,
  -- Trust & Roles
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  responder_type  TEXT        CHECK (responder_type IN ('NGO','Company','Citizen Group','Government')),
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-provision profile on every new sign-up (incl. anonymous)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, handle, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Citizen'),
    NEW.raw_user_meta_data->>'handle',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tier recalculation whenever merit_score changes
CREATE OR REPLACE FUNCTION public.recalculate_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tier_level := CASE
    WHEN NEW.merit_score >= 10000 THEN 8
    WHEN NEW.merit_score >= 7000  THEN 7
    WHEN NEW.merit_score >= 5000  THEN 6
    WHEN NEW.merit_score >= 3500  THEN 5
    WHEN NEW.merit_score >= 2000  THEN 4
    WHEN NEW.merit_score >= 1000  THEN 3
    WHEN NEW.merit_score >= 500   THEN 2
    ELSE 1
  END;
  NEW.tier_label := CASE NEW.tier_level
    WHEN 8 THEN 'Level 8 · Urban Champion'
    WHEN 7 THEN 'Level 7 · City Builder'
    WHEN 6 THEN 'Level 6 · Civic Elder'
    WHEN 5 THEN 'Level 5 · Civic Guardian'
    WHEN 4 THEN 'Level 4 · Trusted Citizen'
    WHEN 3 THEN 'Level 3 · Active Member'
    WHEN 2 THEN 'Level 2 · Rising Voice'
    ELSE      'Level 1 · New Citizen'
  END;
  NEW.next_tier_at := CASE NEW.tier_level
    WHEN 8 THEN 99999
    WHEN 7 THEN 10000
    WHEN 6 THEN 7000
    WHEN 5 THEN 5000
    WHEN 4 THEN 3500
    WHEN 3 THEN 2000
    WHEN 2 THEN 1000
    ELSE 500
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tier_recalc ON public.profiles;
CREATE TRIGGER tier_recalc
  BEFORE UPDATE OF merit_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_tier();

-- =============================================================
--  ISSUES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.issues (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT        NOT NULL,
  summary             TEXT        NOT NULL,
  category            TEXT        NOT NULL CHECK (category IN ('Road','Cleanliness','Water','Lighting','Safety','Parks')),
  status              TEXT        NOT NULL DEFAULT 'Open'
                                  CHECK (status IN ('Open','Verified','NGO Claimed','In Progress','Gov Jurisdiction')),
  locality            TEXT        NOT NULL,
  -- Geospatial (decimal degrees; upgrade to PostGIS geography column later)
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  -- Denormalised display string, overridden client-side with real GPS
  display_distance    TEXT        NOT NULL DEFAULT 'Nearby',
  -- Media
  thumbnail_url       TEXT,
  thumbnail_alt       TEXT,
  -- Reporter (denormalised for public display; FK optional)
  reported_by_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name       TEXT        NOT NULL DEFAULT 'Anonymous',
  reporter_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Engagement counters (maintained by triggers)
  amplifies_count     INTEGER     NOT NULL DEFAULT 0,
  petition_signatures INTEGER     NOT NULL DEFAULT 0,
  petition_goal       INTEGER     NOT NULL DEFAULT 500,
  -- Jurisdiction
  restricted          BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Active responder (denormalised snapshot)
  responder_name      TEXT,
  responder_type      TEXT        CHECK (responder_type IN ('NGO','Company','Citizen Group','Government')),
  responder_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS issues_status_idx   ON public.issues(status);
CREATE INDEX IF NOT EXISTS issues_category_idx ON public.issues(category);
CREATE INDEX IF NOT EXISTS issues_created_idx  ON public.issues(created_at DESC);
CREATE INDEX IF NOT EXISTS issues_locality_idx ON public.issues(locality);

-- =============================================================
--  AMPLIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.amplifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id   UUID        NOT NULL REFERENCES public.issues(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, user_id)
);

CREATE OR REPLACE FUNCTION public.sync_amplify_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.issues   SET amplifies_count = amplifies_count + 1, updated_at = NOW() WHERE id = NEW.issue_id;
    UPDATE public.profiles SET amplifies_count = amplifies_count + 1                       WHERE id = NEW.user_id;
    -- Award 5 merit points per amplification
    PERFORM public.award_merit(NEW.user_id, 5, 'amplified_issue', NEW.issue_id, 'Amplified a civic issue');
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.issues   SET amplifies_count = GREATEST(0, amplifies_count - 1), updated_at = NOW() WHERE id = OLD.issue_id;
    UPDATE public.profiles SET amplifies_count = GREATEST(0, amplifies_count - 1)                      WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS amplify_count_sync ON public.amplifications;
CREATE TRIGGER amplify_count_sync
  AFTER INSERT OR DELETE ON public.amplifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_amplify_count();

-- =============================================================
--  PETITION SIGNATURES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.petition_signatures (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id   UUID        NOT NULL REFERENCES public.issues(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, user_id)
);

CREATE OR REPLACE FUNCTION public.sync_petition_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal  INTEGER;
  v_sigs  INTEGER;
  v_restr BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.issues
    SET petition_signatures = petition_signatures + 1, updated_at = NOW()
    WHERE id = NEW.issue_id
    RETURNING petition_goal, petition_signatures, restricted INTO v_goal, v_sigs, v_restr;

    -- Auto-escalate when goal is reached
    IF v_sigs >= v_goal THEN
      UPDATE public.issues
      SET status = CASE WHEN v_restr THEN 'Gov Jurisdiction' ELSE 'Verified' END
      WHERE id = NEW.issue_id AND status = 'Open';
    END IF;

    -- Award 10 merit for signing
    PERFORM public.award_merit(NEW.user_id, 10, 'signed_petition', NEW.issue_id, 'Signed a locality petition');

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.issues
    SET petition_signatures = GREATEST(0, petition_signatures - 1), updated_at = NOW()
    WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS petition_count_sync ON public.petition_signatures;
CREATE TRIGGER petition_count_sync
  AFTER INSERT OR DELETE ON public.petition_signatures
  FOR EACH ROW EXECUTE FUNCTION public.sync_petition_count();

-- =============================================================
--  ISSUE CLAIMS  (NGO / Company claiming an issue to fix it)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.issue_claims (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID        NOT NULL REFERENCES public.issues(id)   ON DELETE CASCADE,
  claimer_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','completed')),
  notes       TEXT,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (issue_id, claimer_id)
);

CREATE OR REPLACE FUNCTION public.sync_claim_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- When a claim is approved → update issue status + responder snapshot
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.claimer_id;
    UPDATE public.issues SET
      status             = CASE v_profile.responder_type
                             WHEN 'NGO'           THEN 'NGO Claimed'
                             WHEN 'Company'       THEN 'In Progress'
                             WHEN 'Citizen Group' THEN 'In Progress'
                             ELSE 'In Progress'
                           END,
      responder_name     = v_profile.display_name,
      responder_type     = v_profile.responder_type,
      responder_verified = v_profile.is_verified,
      updated_at         = NOW()
    WHERE id = NEW.issue_id;
  END IF;

  -- When a claim is completed → award merit + bump resolved counter
  IF NEW.status = 'completed' AND OLD.status = 'approved' THEN
    UPDATE public.profiles SET resolved_count = resolved_count + 1 WHERE id = NEW.claimer_id;
    UPDATE public.issues SET status = 'Open', updated_at = NOW() WHERE id = NEW.issue_id; -- admin can change later
    PERFORM public.award_merit(NEW.claimer_id, 200, 'resolved_issue', NEW.issue_id, 'Resolved a civic issue');
    NEW.resolved_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claim_status_sync ON public.issue_claims;
CREATE TRIGGER claim_status_sync
  BEFORE UPDATE ON public.issue_claims
  FOR EACH ROW EXECUTE FUNCTION public.sync_claim_status();

-- Award 25 merit just for submitting a claim
CREATE OR REPLACE FUNCTION public.on_claim_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET reports_count = reports_count + 1 WHERE id = NEW.claimer_id;
  PERFORM public.award_merit(NEW.claimer_id, 25, 'claimed_issue', NEW.issue_id, 'Claimed an issue to resolve');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claim_insert_merit ON public.issue_claims;
CREATE TRIGGER claim_insert_merit
  AFTER INSERT ON public.issue_claims
  FOR EACH ROW EXECUTE FUNCTION public.on_claim_insert();

-- =============================================================
--  FEED POSTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              TEXT        NOT NULL CHECK (type IN ('before-after','update')),
  -- Author snapshot (denormalised)
  author_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name       TEXT        NOT NULL,
  author_handle     TEXT        NOT NULL,
  author_avatar_url TEXT,
  -- Content
  title             TEXT,               -- before-after only
  body              TEXT        NOT NULL,
  image_url         TEXT,               -- update type
  image_alt         TEXT,
  before_image_url  TEXT,               -- before-after type
  after_image_url   TEXT,               -- before-after type
  -- Engagement
  likes_count       INTEGER     NOT NULL DEFAULT 0,
  comments_count    INTEGER     NOT NULL DEFAULT 0,
  -- Link to issue
  related_issue_id  UUID        REFERENCES public.issues(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_posts_created_idx ON public.feed_posts(created_at DESC);

-- =============================================================
--  FEED LIKES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.feed_likes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID        NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE OR REPLACE FUNCTION public.sync_feed_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS feed_like_count_sync ON public.feed_likes;
CREATE TRIGGER feed_like_count_sync
  AFTER INSERT OR DELETE ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_like_count();

-- =============================================================
--  COMPETITIONS  (CSR brand-sponsored drives)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.competitions (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title              TEXT        NOT NULL,
  sponsor            TEXT        NOT NULL,
  image_url          TEXT,
  points             INTEGER     NOT NULL DEFAULT 100,
  participants_count INTEGER     NOT NULL DEFAULT 0,
  ends_at            TIMESTAMPTZ NOT NULL,
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
--  COMPETITION PARTICIPANTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.competition_participants (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID        NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, user_id)
);

CREATE OR REPLACE FUNCTION public.sync_competition_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pts INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT points INTO v_pts FROM public.competitions WHERE id = NEW.competition_id;
    UPDATE public.competitions SET participants_count = participants_count + 1 WHERE id = NEW.competition_id;
    -- Award 10 % of prize on join as participation credit
    PERFORM public.award_merit(NEW.user_id, GREATEST(10, v_pts / 10), 'competition_join', NEW.competition_id, 'Joined a sponsored drive');
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.competitions SET participants_count = GREATEST(0, participants_count - 1) WHERE id = OLD.competition_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS competition_join_sync ON public.competition_participants;
CREATE TRIGGER competition_join_sync
  AFTER INSERT OR DELETE ON public.competition_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_competition_join();

-- =============================================================
--  REWARDS CATALOGUE
-- =============================================================
CREATE TABLE IF NOT EXISTS public.rewards (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  cost         INTEGER     NOT NULL,
  icon         TEXT        NOT NULL DEFAULT 'gift',
  quantity     INTEGER,               -- NULL = unlimited
  is_available BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
--  REWARD CLAIMS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_id  UUID        NOT NULL REFERENCES public.rewards(id)   ON DELETE RESTRICT,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  merit_cost INTEGER     NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduct merit on reward claim
CREATE OR REPLACE FUNCTION public.on_reward_claim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_score INTEGER;
BEGIN
  SELECT merit_score INTO v_score FROM public.profiles WHERE id = NEW.user_id;
  IF v_score < NEW.merit_cost THEN
    RAISE EXCEPTION 'Insufficient merit score';
  END IF;
  UPDATE public.profiles SET merit_score = merit_score - NEW.merit_cost WHERE id = NEW.user_id;
  -- Reduce quantity if finite
  UPDATE public.rewards
  SET quantity = quantity - 1, is_available = (quantity - 1 > 0)
  WHERE id = NEW.reward_id AND quantity IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reward_claim_deduct ON public.reward_claims;
CREATE TRIGGER reward_claim_deduct
  BEFORE INSERT ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.on_reward_claim();

-- =============================================================
--  MERIT TRANSACTIONS  (append-only audit log)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.merit_transactions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points       INTEGER     NOT NULL,
  action_type  TEXT        NOT NULL,
  reference_id UUID,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS merit_tx_user_created_idx ON public.merit_transactions(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  award_merit() — Reusable helper called by ALL trigger functions
--  below. MUST be defined before any trigger function that calls it.
--  (PostgreSQL resolves PL/pgSQL calls at runtime, so the order
--  doesn't error at CREATE time, but it matters for CI seeds that
--  run inserts in the same transaction as schema creation.)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_merit(
  p_user_id UUID,
  p_points  INTEGER,
  p_action  TEXT,
  p_ref_id  UUID    DEFAULT NULL,
  p_desc    TEXT    DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET merit_score = merit_score + p_points WHERE id = p_user_id;
  INSERT INTO public.merit_transactions (user_id, points, action_type, reference_id, description)
  VALUES (p_user_id, p_points, p_action, p_ref_id, p_desc);
END;
$$;

-- Merit on issue reporting
CREATE OR REPLACE FUNCTION public.on_issue_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.reported_by_id IS NOT NULL THEN
    UPDATE public.profiles SET reports_count = reports_count + 1 WHERE id = NEW.reported_by_id;
    PERFORM public.award_merit(NEW.reported_by_id, 50, 'reported_issue', NEW.id, 'Reported a civic issue');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS issue_insert_merit ON public.issues;
CREATE TRIGGER issue_insert_merit
  AFTER INSERT ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.on_issue_insert();

-- =============================================================
--  ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amplifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_signatures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_claims             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merit_transactions       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_read_all"    ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING  (auth.uid() = id);

-- issues
CREATE POLICY "issues_read_all"      ON public.issues FOR SELECT USING (TRUE);
CREATE POLICY "issues_insert_auth"   ON public.issues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "issues_update_owner"  ON public.issues FOR UPDATE USING  (auth.uid() = reported_by_id);

-- amplifications
CREATE POLICY "amp_read_all"         ON public.amplifications FOR SELECT USING (TRUE);
CREATE POLICY "amp_insert_own"       ON public.amplifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "amp_delete_own"       ON public.amplifications FOR DELETE USING  (auth.uid() = user_id);

-- petition_signatures
CREATE POLICY "pet_read_all"         ON public.petition_signatures FOR SELECT USING (TRUE);
CREATE POLICY "pet_insert_own"       ON public.petition_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pet_delete_own"       ON public.petition_signatures FOR DELETE USING  (auth.uid() = user_id);

-- issue_claims
CREATE POLICY "claims_read_all"      ON public.issue_claims FOR SELECT USING (TRUE);
CREATE POLICY "claims_insert_own"    ON public.issue_claims FOR INSERT WITH CHECK (auth.uid() = claimer_id);
CREATE POLICY "claims_update_own"    ON public.issue_claims FOR UPDATE USING  (auth.uid() = claimer_id);

-- feed_posts
CREATE POLICY "feed_read_all"        ON public.feed_posts FOR SELECT USING (TRUE);
CREATE POLICY "feed_insert_auth"     ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- feed_likes
CREATE POLICY "likes_read_all"       ON public.feed_likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_insert_own"     ON public.feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own"     ON public.feed_likes FOR DELETE USING  (auth.uid() = user_id);

-- competitions
CREATE POLICY "comp_read_active"     ON public.competitions             FOR SELECT USING (is_active = TRUE);
CREATE POLICY "comp_part_read_all"   ON public.competition_participants FOR SELECT USING (TRUE);
CREATE POLICY "comp_part_insert_own" ON public.competition_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comp_part_delete_own" ON public.competition_participants FOR DELETE USING  (auth.uid() = user_id);

-- rewards
CREATE POLICY "rewards_read_avail"   ON public.rewards       FOR SELECT USING (is_available = TRUE);
CREATE POLICY "rclaims_read_own"     ON public.reward_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rclaims_insert_own"   ON public.reward_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- merit
CREATE POLICY "merit_read_own"       ON public.merit_transactions FOR SELECT USING (auth.uid() = user_id);

-- =============================================================
--  REALTIME  (enable for tables the UI subscribes to)
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.amplifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.petition_signatures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;

-- =============================================================
--  FEED COMMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID        NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.sync_feed_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS feed_comment_count_sync ON public.feed_comments;
CREATE TRIGGER feed_comment_count_sync
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_comment_count();

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_all"       ON public.feed_comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert_auth"    ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_delete_own"     ON public.feed_comments FOR DELETE USING  (auth.uid() = user_id);

-- =============================================================
--  NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_read_own"         ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifs_update_own"       ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Trigger function handles both INSERT (new submission) and UPDATE OF status
CREATE OR REPLACE FUNCTION public.notify_on_issue_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- On INSERT: notify the reporter that their issue was submitted
  IF TG_OP = 'INSERT' THEN
    IF NEW.reported_by_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (
        NEW.reported_by_id,
        'Issue Submitted',
        'Your issue "' || NEW.title || '" has been received and is under review.',
        'issue_submitted'
      );
    END IF;
  -- On UPDATE: notify on any status change
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status AND NEW.reported_by_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (
        NEW.reported_by_id,
        'Issue Update',
        'Your issue "' || NEW.title || '" is now ' || NEW.status,
        'issue_update'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS issue_update_notif ON public.issues;
CREATE TRIGGER issue_update_notif
  AFTER INSERT OR UPDATE OF status ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_issue_update();

-- =============================================================
--  RECOMMENDATION ALGORITHM
-- =============================================================
CREATE OR REPLACE FUNCTION public.recommend_issues(p_user_id UUID, p_lat FLOAT, p_lon FLOAT, p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.issues LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT i.*
  FROM public.issues i
  -- Allowlist matching the issues.status CHECK constraint.
  -- Previously was NOT IN ('Resolved','Closed') which are not valid
  -- statuses, so the filter matched every row — effectively no filter.
  WHERE i.status IN ('Open', 'Verified', 'NGO Claimed', 'In Progress')
  ORDER BY 
    -- 1. Proximity Score (if coordinates exist, heavily weight nearby issues)
    CASE 
      WHEN p_lat IS NOT NULL AND p_lon IS NOT NULL AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL THEN
        -- Approximate distance calculation using Pythagorean theorem on equirectangular projection for speed
        ((p_lat - i.latitude) * (p_lat - i.latitude)) + ((p_lon - i.longitude) * (p_lon - i.longitude))
      ELSE 9999 -- High distance penalty if no coords
    END ASC,
    -- 2. Popularity / Engagement (more amplifies = higher priority)
    (i.amplifies_count + i.petition_signatures) DESC,
    -- 3. Recency
    i.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Add feed_comments and notifications to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

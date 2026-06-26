-- =============================================================
--  CitySankalp – Seed Data
--  Run AFTER schema.sql in Supabase → SQL Editor
-- =============================================================

-- ── Issues ────────────────────────────────────────────────────
INSERT INTO public.issues
  (title, summary, category, status, locality, display_distance,
   thumbnail_url, thumbnail_alt,
   reporter_name, reporter_verified,
   amplifies_count, petition_signatures, petition_goal,
   restricted,
   responder_name, responder_type, responder_verified,
   latitude, longitude)
VALUES
  (
    'Open manhole left uncovered near the school gate',
    'An uncovered manhole on the main approach to the primary school poses a serious risk to children during the morning rush. Needs an immediate cover and barricade.',
    'Safety', 'Verified', 'Shivaji Nagar', '0.4 km away',
    '/issues/manhole.png', 'Uncovered manhole on a city street',
    'Priya Nair', TRUE,
    312, 286, 500,
    FALSE,
    NULL, NULL, FALSE,
    12.9716, 77.5946
  ),
  (
    'Massive pothole on MG Road near the metro entrance',
    'A deep, water-filled pothole right at the metro exit is causing two-wheeler skids daily. This stretch is a state highway, so only the municipal roads authority is permitted to repair it.',
    'Road', 'Gov Jurisdiction', 'MG Road', '1.2 km away',
    '/issues/pothole.png', 'Large pothole filled with water on a road',
    'Rahul Verma', FALSE,
    248, 412, 500,
    TRUE,
    'City Roads Authority', 'Government', TRUE,
    12.9754, 77.6069
  ),
  (
    'Overflowing garbage bins behind the vegetable market',
    'Bins haven''t been cleared in days; waste is spilling onto the road and attracting strays. A local NGO has stepped in to run a clean-up drive.',
    'Cleanliness', 'NGO Claimed', 'Lakshmi Market', '0.8 km away',
    '/issues/garbage.png', 'Overflowing garbage bins on a street corner',
    'Saaf Sheher Foundation', TRUE,
    187, 154, 250,
    FALSE,
    'Saaf Sheher Foundation', 'NGO', TRUE,
    12.9698, 77.5987
  ),
  (
    'Street light out on the entire 4th cross lane',
    'The whole lane has been dark for over a week, making it unsafe after sunset. Falls under the electricity board''s jurisdiction.',
    'Lighting', 'Gov Jurisdiction', 'Indira Layout', '2.1 km away',
    '/issues/streetlight.png', 'Dark residential street with a broken street light',
    'Meena Iyer', FALSE,
    132, 98, 300,
    TRUE,
    'State Electricity Board', 'Government', TRUE,
    12.9773, 77.5905
  ),
  (
    'Water pipeline leak flooding the footpath',
    'A burst pipe is wasting water and flooding the footpath by the bus stop. Open for a verified plumber group or the water board to claim.',
    'Water', 'Verified', 'Gandhi Bazaar', '1.7 km away',
    '/issues/waterleak.png', 'Water leaking from a pipe onto a footpath',
    'Arjun Das', TRUE,
    96, 61, 200,
    FALSE,
    NULL, NULL, FALSE,
    12.9681, 77.5958
  ),
  (
    'Broken swings and rusted railings at the kids'' park',
    'Play equipment is rusted and unsafe. A CSR-funded NGO is currently restoring and repainting the park.',
    'Parks', 'In Progress', 'Ward 12', '2.6 km away',
    '/issues/park.png', 'Rusted broken swings at a children''s park',
    'Ward 12 Residents', TRUE,
    74, 203, 250,
    FALSE,
    'Green Streets Collective', 'NGO', TRUE,
    12.9742, 77.6012
  );

-- ── Feed Posts ────────────────────────────────────────────────
INSERT INTO public.feed_posts
  (type, author_name, author_handle, author_avatar_url,
   title, body,
   before_image_url, after_image_url,
   image_url, image_alt,
   likes_count, comments_count)
VALUES
  (
    'before-after',
    'Green Streets Collective', '@greenstreets', '/avatars/ngo1.png',
    'MG Road footpath fully restored',
    'What was a flooded, broken stretch is now a clean walkway. 248 citizens amplified this — thank you for the pressure that made it happen.',
    '/feed/footpath-before.png', '/feed/footpath-after.png',
    NULL, NULL,
    1240, 86
  ),
  (
    'update',
    'Saaf Sheher Foundation', '@saafsheher', '/avatars/ngo2.png',
    NULL,
    'Day 3 of the Lakshmi Market clean-up drive. 40 volunteers, 2 tonnes of waste segregated, and new compost bins installed. Ongoing through the weekend.',
    NULL, NULL,
    '/feed/cleanup-drive.png', 'Volunteers in green vests cleaning a market street',
    932, 54
  ),
  (
    'before-after',
    'Ward 12 Residents', '@ward12', '/avatars/ngo3.png',
    'Children''s park swings repaired & repainted',
    'Rusted, unsafe equipment replaced with the help of the local NGO and CSR funding. The park is open and safe again.',
    '/feed/park-before.png', '/feed/park-after.png',
    NULL, NULL,
    2103, 142
  );

-- ── Competitions ──────────────────────────────────────────────
INSERT INTO public.competitions
  (title, sponsor, image_url, points, participants_count, ends_at)
VALUES
  (
    'Green Earth Cleanliness Drive',
    'Verdant Co.',
    '/rewards/comp-cleanliness.png',
    500, 1820,
    NOW() + INTERVAL '6 days'
  ),
  (
    'Pothole-Free Streets Challenge',
    'Asphalt Motors',
    '/rewards/comp-roads.png',
    350, 940,
    NOW() + INTERVAL '12 days'
  );

-- ── Rewards ───────────────────────────────────────────────────
INSERT INTO public.rewards (name, cost, icon) VALUES
  ('Free Metro Day Pass',        200, 'ticket'),
  ('Café Reward Voucher',        350, 'coffee'),
  ('Plant a Tree in Your Name',  150, 'leaf'),
  ('CitySankalp Tote Bag',       500, 'gift'),
  ('Volunteer Tee',              650, 'shirt');

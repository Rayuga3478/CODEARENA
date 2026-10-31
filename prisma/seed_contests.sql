DO $$
DECLARE
  admin_id TEXT;
  contest_id TEXT;
  prob_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM "User" WHERE handle = 'admin' LIMIT 1;

  -- Contest 1: Weekly Round (Upcoming)
  contest_id := gen_random_uuid()::TEXT;
  INSERT INTO "Contest" (id, title, description, "startTime", "endTime", duration, status, visibility, "createdById", "createdAt", "updatedAt")
  VALUES (
    contest_id,
    'Weekly Round #1',
    'Practice round covering arrays, dynamic programming, and math. Solve as many problems as you can in 2 hours.',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '2 hours',
    120,
    'UPCOMING',
    'PUBLIC',
    admin_id,
    NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  IF FOUND THEN
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'fibonacci-number';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'A', 0, 100) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'two-sum';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'B', 1, 200) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'maximum-subarray';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'C', 2, 300) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'longest-increasing-subsequence';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'D', 3, 500) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Contest 2: Beginner Contest (Ended)
  contest_id := gen_random_uuid()::TEXT;
  INSERT INTO "Contest" (id, title, description, "startTime", "endTime", duration, status, visibility, "createdById", "createdAt", "updatedAt")
  VALUES (
    contest_id,
    'Beginner Contest #1',
    'A beginner-friendly contest with easy to medium problems. Perfect for those just starting competitive programming.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '90 minutes',
    90,
    'ENDED',
    'PUBLIC',
    admin_id,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  ) ON CONFLICT DO NOTHING;

  IF FOUND THEN
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'greatest-common-divisor';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'A', 0, 100) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'valid-palindrome';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'B', 1, 200) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'climbing-stairs';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'C', 2, 300) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Contest 3: Graph Challenge (Running)
  contest_id := gen_random_uuid()::TEXT;
  INSERT INTO "Contest" (id, title, description, "startTime", "endTime", duration, status, visibility, "createdById", "createdAt", "updatedAt")
  VALUES (
    contest_id,
    'Graph Challenge #1',
    'Test your graph algorithms knowledge! Problems ranging from BFS/DFS to shortest paths.',
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '90 minutes',
    120,
    'RUNNING',
    'PUBLIC',
    admin_id,
    NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'
  ) ON CONFLICT DO NOTHING;

  IF FOUND THEN
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'shortest-path-unweighted';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'A', 0, 300) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'binary-search';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'B', 1, 200) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO prob_id FROM "Problem" WHERE slug = 'count-inversions';
    IF prob_id IS NOT NULL THEN
      INSERT INTO "ContestProblem" ("contestId", "problemId", label, "orderIndex", points) VALUES (contest_id, prob_id, 'C', 2, 400) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RAISE NOTICE 'Seeded 3 contests successfully.';
END $$;

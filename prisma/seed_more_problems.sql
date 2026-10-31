-- Seed additional problems
DO $$
DECLARE
  admin_id TEXT;
  prob_id TEXT;
  tag_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM "User" WHERE handle = 'admin' LIMIT 1;

  -- Problem 5: Binary Search
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'binary-search', 'Binary Search',
    E'Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return -1.',
    E'The first line contains two integers n and target.\nThe second line contains n sorted integers.',
    E'Print the 0-indexed position of target, or -1 if not found.',
    E'1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9',
    900, 1000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'5 3\n1 2 3 4 5\n', E'2\n', true, 0),
      (gen_random_uuid(), prob_id, E'5 6\n1 2 3 4 5\n', E'-1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='binary-search';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='arrays';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 6: Merge Sort Count Inversions
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'count-inversions', 'Count Inversions',
    E'Given an array of n integers, count the number of inversions. An inversion is a pair (i, j) such that i < j and arr[i] > arr[j].',
    E'The first line contains an integer n.\nThe second line contains n space-separated integers.',
    E'Print a single integer — the number of inversions.',
    E'1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9',
    1600, 2000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'5\n2 4 1 3 5\n', E'3\n', true, 0),
      (gen_random_uuid(), prob_id, E'3\n3 2 1\n', E'3\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='sorting';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='arrays';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 7: Fibonacci Number
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'fibonacci-number', 'Fibonacci Number',
    E'Compute the n-th Fibonacci number. F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).',
    E'A single integer n.',
    E'Print F(n).',
    E'0 <= n <= 45',
    800, 1000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'10\n', E'55\n', true, 0),
      (gen_random_uuid(), prob_id, E'0\n', E'0\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='math';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='dynamic-programming';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 8: Maximum Subarray (Kadane's)
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'maximum-subarray', 'Maximum Subarray',
    E'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    E'The first line contains n.\nThe second line contains n space-separated integers.',
    E'Print the maximum subarray sum.',
    E'1 <= n <= 10^5\n-10^4 <= nums[i] <= 10^4',
    1200, 2000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'9\n-2 1 -3 4 -1 2 1 -5 4\n', E'6\n', true, 0),
      (gen_random_uuid(), prob_id, E'1\n1\n', E'1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='arrays';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='dynamic-programming';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='greedy';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 9: Graph BFS
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'shortest-path-unweighted', 'Shortest Path in Unweighted Graph',
    E'Given an undirected unweighted graph with n vertices and m edges, find the shortest path from vertex 1 to vertex n. If no path exists, print -1.',
    E'The first line contains n and m.\nThe next m lines each contain two integers u and v representing an edge.',
    E'Print the length of the shortest path from 1 to n, or -1.',
    E'2 <= n <= 10^5\n1 <= m <= 2*10^5',
    1800, 2000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'4 4\n1 2\n2 3\n3 4\n1 3\n', E'2\n', true, 0),
      (gen_random_uuid(), prob_id, E'3 1\n1 2\n', E'-1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='graphs';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 10: Longest Increasing Subsequence
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'longest-increasing-subsequence', 'Longest Increasing Subsequence',
    E'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
    E'The first line contains n.\nThe second line contains n integers.',
    E'Print the length of the LIS.',
    E'1 <= n <= 2500\n-10^4 <= nums[i] <= 10^4',
    1900, 2000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'8\n10 9 2 5 3 7 101 18\n', E'4\n', true, 0),
      (gen_random_uuid(), prob_id, E'5\n7 7 7 7 7\n', E'1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='dynamic-programming';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='binary-search';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 11: GCD
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'greatest-common-divisor', 'Greatest Common Divisor',
    E'Given two positive integers a and b, find their greatest common divisor.',
    E'Two space-separated integers a and b.',
    E'Print gcd(a, b).',
    E'1 <= a, b <= 10^18',
    800, 1000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'12 8\n', E'4\n', true, 0),
      (gen_random_uuid(), prob_id, E'7 13\n', E'1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='math';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Problem 12: Coin Change
  prob_id := gen_random_uuid()::TEXT;
  INSERT INTO "Problem" (id, slug, title, statement, "inputFormat", "outputFormat", constraints, difficulty, "timeLimitMs", "memoryLimitMb", "authorId", status, "createdAt", "updatedAt")
  VALUES (prob_id, 'coin-change', 'Coin Change',
    E'You are given coins of different denominations and a total amount of money. Return the fewest number of coins that you need to make up that amount. If the amount cannot be made up, return -1.',
    E'The first line contains n (number of coin types) and amount.\nThe second line contains n coin denominations.',
    E'Print the minimum number of coins, or -1.',
    E'1 <= n <= 12\n1 <= amount <= 10^4',
    1400, 2000, 256, admin_id, 'PUBLISHED', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO "TestCase" (id, "problemId", input, "expectedOutput", "isExample", "orderIndex") VALUES
      (gen_random_uuid(), prob_id, E'3 11\n1 5 6\n', E'3\n', true, 0),
      (gen_random_uuid(), prob_id, E'1 3\n2\n', E'-1\n', true, 1);
    SELECT id INTO tag_id FROM "Tag" WHERE name='dynamic-programming';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
    SELECT id INTO tag_id FROM "Tag" WHERE name='greedy';
    INSERT INTO "ProblemTag" ("problemId", "tagId") VALUES (prob_id, tag_id) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Seeded additional problems successfully.';
END $$;

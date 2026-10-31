INSERT INTO "Language" (id, slug, "displayName", "fileExtension", "compileCommand", "runCommand", "isActive")
VALUES (gen_random_uuid(), 'cpp17', 'C++17', '.cpp', 'g++ -std=c++17 -O2 -o solution solution.cpp', './solution', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Language" (id, slug, "displayName", "fileExtension", "compileCommand", "runCommand", "isActive")
VALUES (gen_random_uuid(), 'python3', 'Python 3', '.py', NULL, 'python3 solution.py', false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Language" (id, slug, "displayName", "fileExtension", "compileCommand", "runCommand", "isActive")
VALUES (gen_random_uuid(), 'java17', 'Java 17', '.java', 'javac Solution.java', 'java -Xmx256m Solution', false)
ON CONFLICT (slug) DO NOTHING;

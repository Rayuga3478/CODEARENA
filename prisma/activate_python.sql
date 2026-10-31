UPDATE "Language" SET "isActive" = true WHERE slug IN ('cpp17', 'python3');
SELECT slug, "isActive" FROM "Language" ORDER BY slug;

import 'dotenv/config';
import { PrismaClient } from '../apps/api/src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as argon2 from 'argon2';

// Note: Ensure DATABASE_URL is set in environment or .env at root
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Admin User
  const adminPassword = await argon2.hash('admin123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@codearena.local' },
    update: {},
    create: {
      handle: 'admin',
      email: 'admin@codearena.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isVerified: true,
      rating: 3000,
      maxRating: 3000,
    },
  });
  console.log(`✅ Admin user created: ${admin.handle}`);

  // 2. Create Tags
  const tags = [
    { name: 'arrays', color: '#3b82f6' },
    { name: 'strings', color: '#10b981' },
    { name: 'math', color: '#f59e0b' },
    { name: 'dynamic-programming', color: '#8b5cf6' },
    { name: 'graphs', color: '#ec4899' },
    { name: 'greedy', color: '#ef4444' },
    { name: 'sorting', color: '#06b6d4' },
    { name: 'two-pointers', color: '#14b8a6' },
    { name: 'binary-search', color: '#6366f1' },
  ];

  for (const tagData of tags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: tagData,
    });
  }
  console.log(`✅ ${tags.length} tags created`);

  // 3. Create Problems
  const problems = [
    {
      slug: 'two-sum',
      title: 'Two Sum',
      statement: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      inputFormat: 'The first line contains two integers `n` and `target`, where `n` is the length of the array.\nThe second line contains `n` space-separated integers representing the array `nums`.',
      outputFormat: 'Print two space-separated integers, the indices of the two numbers (0-indexed).',
      constraints: '2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
      difficulty: 800,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      tags: ['arrays', 'math', 'two-pointers'],
      authorId: admin.id,
      testCases: [
        { input: '4 9\n2 7 11 15\n', expectedOutput: '0 1\n', isExample: true, explanation: 'nums[0] + nums[1] = 2 + 7 = 9.', score: 0 },
        { input: '3 6\n3 2 4\n', expectedOutput: '1 2\n', isExample: true, score: 0 },
        { input: '2 6\n3 3\n', expectedOutput: '0 1\n', isExample: false, score: 100 },
      ]
    },
    {
      slug: 'valid-palindrome',
      title: 'Valid Palindrome',
      statement: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
      inputFormat: 'The first and only line contains a string `s`.',
      outputFormat: 'Print `true` if `s` is a valid palindrome, else `false`.',
      constraints: '1 <= s.length <= 2 * 10^5\n`s` consists only of printable ASCII characters.',
      difficulty: 900,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      tags: ['strings', 'two-pointers'],
      authorId: admin.id,
      testCases: [
        { input: 'A man, a plan, a canal: Panama\n', expectedOutput: 'true\n', isExample: true, explanation: '\"amanaplanacanalpanama\" is a palindrome.', score: 0 },
        { input: 'race a car\n', expectedOutput: 'false\n', isExample: true, explanation: '\"raceacar\" is not a palindrome.', score: 0 },
      ]
    },
    {
      slug: 'climbing-stairs',
      title: 'Climbing Stairs',
      statement: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
      inputFormat: 'A single integer `n`.',
      outputFormat: 'A single integer, the number of distinct ways to reach the top.',
      constraints: '1 <= n <= 45',
      difficulty: 1000,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      tags: ['math', 'dynamic-programming'],
      authorId: admin.id,
      testCases: [
        { input: '2\n', expectedOutput: '2\n', isExample: true, explanation: '1. 1 step + 1 step\n2. 2 steps', score: 0 },
        { input: '3\n', expectedOutput: '3\n', isExample: true, explanation: '1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step', score: 0 },
      ]
    },
    // Adding a few more to populate the list
    {
      slug: 'longest-common-subsequence',
      title: 'Longest Common Subsequence',
      statement: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.',
      inputFormat: 'Two lines, each containing a string.',
      outputFormat: 'An integer representing the length of the longest common subsequence.',
      constraints: '1 <= text1.length, text2.length <= 1000',
      difficulty: 1500,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      tags: ['strings', 'dynamic-programming'],
      authorId: admin.id,
      testCases: [
        { input: 'abcde\nace\n', expectedOutput: '3\n', isExample: true, score: 0 },
        { input: 'abc\nabc\n', expectedOutput: '3\n', isExample: true, score: 0 },
        { input: 'abc\ndef\n', expectedOutput: '0\n', isExample: true, score: 0 },
      ]
    }
  ];

  for (const prob of problems) {
    const { tags: probTags, testCases, ...probData } = prob;

    const existing = await prisma.problem.findUnique({ where: { slug: probData.slug } });
    if (!existing) {
      // Connect tags
      const tagConnections = probTags.map(tagName => ({
        tag: { connect: { name: tagName } }
      }));

      await prisma.problem.create({
        data: {
          ...probData,
          tags: {
            create: tagConnections,
          },
          testCases: {
            create: testCases,
          }
        }
      });
      console.log(`✅ Problem created: ${prob.title}`);
    } else {
      console.log(`⏭️ Problem already exists: ${prob.title}`);
    }
  }

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

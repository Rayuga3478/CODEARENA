import { z } from 'zod';

// Pagination and Query
export const problemQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  difficulty: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  maxRating: z.coerce.number().optional(),
  status: z.enum(['all', 'solved', 'unsolved', 'attempted']).optional(),
  sortBy: z.enum(['createdAt', 'difficulty', 'solvedCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Problem Creation
export const createProblemSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  title: z.string().min(3).max(200),
  statement: z.string().min(10),
  inputFormat: z.string().min(10),
  outputFormat: z.string().min(10),
  constraints: z.string().min(1),
  difficulty: z.number().min(800).max(4000),
  timeLimitMs: z.number().min(100).max(15000),
  memoryLimitMb: z.number().min(16).max(1024),
  isHidden: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// Problem Update
export const updateProblemSchema = createProblemSchema.partial();

// Test Case Creation
export const createTestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isExample: z.boolean().default(false),
  explanation: z.string().optional(),
  score: z.number().min(0).max(100).default(0),
});

// Test Case Update
export const updateTestCaseSchema = createTestCaseSchema.partial();

// Tag Creation
export const createTagSchema = z.object({
  name: z.string().min(2).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
});

export type ProblemQueryInput = z.infer<typeof problemQuerySchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;

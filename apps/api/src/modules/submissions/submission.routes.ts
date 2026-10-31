import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { getRedis } from '../../config/index.js';
import { randomUUID } from 'node:crypto';

const createSubmissionSchema = z.object({
  problemSlug: z.string().min(1),
  languageId: z.string().min(1),
  sourceCode: z.string().min(1).max(65536),
  contestId: z.string().uuid().optional(),
});

const runSchema = z.object({
  problemSlug: z.string().min(1),
  languageId: z.string().min(1),
  sourceCode: z.string().min(1).max(65536),
  input: z.string().max(65536).default(''),
});

/** Redis keys shared with the judge worker. */
const RUN_QUEUE = 'judge:run';
const runResultKey = (id: string) => `judge:run:result:${id}`;

const submissionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  problemSlug: z.string().optional(),
  userId: z.string().optional(),
  verdict: z.string().optional(),
});

export async function submissionRoutes(app: FastifyInstance): Promise<void> {
  // Create submission (authenticated)
  app.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createSubmissionSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid submission data', parsed.error.flatten().fieldErrors);
      }

      const { problemSlug, languageId, sourceCode, contestId } = parsed.data;
      const prisma = getPrisma();

      // Verify problem exists
      const problem = await prisma.problem.findUnique({
        where: { slug: problemSlug },
        select: { id: true, status: true },
      });

      if (!problem || problem.status !== 'PUBLISHED') {
        throw new NotFoundError('Problem');
      }

      // Verify language exists
      const language = await prisma.language.findUnique({
        where: { slug: languageId },
        select: { id: true, isActive: true },
      });

      if (!language || !language.isActive) {
        throw new ValidationError('Invalid or unsupported language');
      }

      // Contest submissions: contest must be running, problem must belong to it,
      // and the user must be registered.
      if (contestId) {
        const contest = await prisma.contest.findUnique({
          where: { id: contestId },
          select: {
            status: true,
            problems: { where: { problemId: problem.id }, select: { problemId: true } },
            participants: { where: { userId: request.user!.sub }, select: { userId: true } },
          },
        });
        if (!contest) throw new NotFoundError('Contest');
        if (contest.status !== 'RUNNING') throw new ValidationError('This contest is not running');
        if (contest.problems.length === 0) throw new ValidationError('Problem is not part of this contest');
        if (contest.participants.length === 0) throw new ValidationError('You are not registered for this contest');
      }

      // Create submission
      const submission = await prisma.submission.create({
        data: {
          userId: request.user!.sub,
          problemId: problem.id,
          languageId: language.id,
          sourceCode,
          verdict: 'QUEUED',
          contestId: contestId ?? null,
        },
        select: {
          id: true,
          verdict: true,
          createdAt: true,
        },
      });

      // Enqueue the submission for judging via Redis/BullMQ
      try {
        const redis = getRedis();
        await redis.lpush('judge:queue', JSON.stringify({
          submissionId: submission.id,
          problemId: problem.id,
          languageSlug: languageId,
          sourceCode,
        }));
      } catch (err) {
        // If queue fails, mark as INTERNAL_ERROR
        await prisma.submission.update({
          where: { id: submission.id },
          data: { verdict: 'INTERNAL_ERROR' },
        });
        request.log.error({ err }, 'Failed to enqueue submission for judging');
      }

      return reply.status(201).send(
        successResponse({
          submission: {
            id: submission.id,
            verdict: submission.verdict,
            createdAt: submission.createdAt,
          },
        }),
      );
    },
  );

  // Run code against custom input (authenticated). Does not create a submission.
  app.post(
    '/run',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = runSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid run data', parsed.error.flatten().fieldErrors);
      }
      const { problemSlug, languageId, sourceCode, input } = parsed.data;
      const prisma = getPrisma();

      const [problem, language] = await Promise.all([
        prisma.problem.findUnique({
          where: { slug: problemSlug },
          select: { id: true, status: true, timeLimitMs: true, memoryLimitMb: true },
        }),
        prisma.language.findUnique({ where: { slug: languageId }, select: { isActive: true } }),
      ]);
      if (!problem || problem.status !== 'PUBLISHED') throw new NotFoundError('Problem');
      if (!language || !language.isActive) throw new ValidationError('Invalid or unsupported language');

      const runId = randomUUID();
      const redis = getRedis();
      await redis.set(runResultKey(runId), JSON.stringify({ status: 'QUEUED', userId: request.user!.sub }), 'EX', 300);
      await redis.lpush(RUN_QUEUE, JSON.stringify({
        runId,
        userId: request.user!.sub,
        languageSlug: languageId,
        sourceCode,
        input,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitMb: problem.memoryLimitMb,
      }));

      return reply.status(202).send(successResponse({ runId, status: 'QUEUED' }));
    },
  );

  // Poll a run result
  app.get<{ Params: { runId: string } }>(
    '/run/:runId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const raw = await getRedis().get(runResultKey(request.params.runId));
      if (!raw) throw new NotFoundError('Run');
      const result = JSON.parse(raw);
      if (result.userId !== request.user!.sub) throw new NotFoundError('Run');
      delete result.userId;
      return reply.send(successResponse({ run: result }));
    },
  );

  // List submissions
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = submissionQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters');
    }

    const { page, limit, problemSlug, userId, verdict } = parsed.data;
    const skip = (page - 1) * limit;
    const prisma = getPrisma();

    const where: any = {};

    if (problemSlug) {
      const problem = await prisma.problem.findUnique({ where: { slug: problemSlug } });
      if (problem) where.problemId = problem.id;
    }

    if (userId) where.userId = userId;
    if (verdict) where.verdict = verdict;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          verdict: true,
          executionTimeMs: true,
          memoryUsedKb: true,
          languageId: true,
          createdAt: true,
          user: { select: { handle: true } },
          problem: { select: { slug: true, title: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    const languages = await prisma.language.findMany({ select: { id: true, displayName: true } });
    const langName = new Map(languages.map((l) => [l.id, l.displayName]));

    return reply.send(
      successResponse({
        data: submissions.map((s) => ({ ...s, language: langName.get(s.languageId) ?? null })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  });

  // Get single submission
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const prisma = getPrisma();

    const submission = await prisma.submission.findUnique({
      where: { id: request.params.id },
      include: {
        user: { select: { handle: true } },
        problem: { select: { slug: true, title: true } },
        results: {
          orderBy: { testCaseIndex: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundError('Submission');
    }

    // Only show source code to the submission owner or admins
    const showSourceCode = request.user?.sub === submission.userId || request.user?.role === 'ADMIN';

    return reply.send(
      successResponse({
        submission: {
          ...submission,
          sourceCode: showSourceCode ? submission.sourceCode : undefined,
        },
      }),
    );
  });
}

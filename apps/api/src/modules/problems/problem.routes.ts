import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.js';
import {
  problemQuerySchema,
  createProblemSchema,
  createTestCaseSchema,
} from './problem.schemas.js';

export async function problemRoutes(app: FastifyInstance): Promise<void> {
  // ─── Public Routes ────────────────────────────────────────────────────────

  // List problems (only PUBLISHED ones for public)
  app.get('/', { preHandler: [optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = problemQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
    }

    const { page, limit, search, tags, difficulty, minRating, maxRating, status, sortBy, order } = parsed.data;
    const skip = (page - 1) * limit;
    const prisma = getPrisma();
    const userId = request.user?.sub;

    // Build where clause
    const where: any = { status: 'PUBLISHED' };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (difficulty) {
      where.difficulty = difficulty;
    } else if (minRating || maxRating) {
      where.difficulty = {
        ...(minRating ? { gte: minRating } : {}),
        ...(maxRating ? { lte: maxRating } : {}),
      };
    }

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      where.tags = {
        some: {
          tag: { name: { in: tagList } },
        },
      };
    }

    // Personal status filter (only meaningful when logged in)
    if (userId && status === 'solved') {
      where.userProblems = { some: { userId, status: 'SOLVED' } };
    } else if (userId && status === 'unsolved') {
      where.userProblems = { none: { userId, status: 'SOLVED' } };
    } else if (userId && status === 'attempted') {
      where.AND = [
        { submissions: { some: { userId } } },
        { userProblems: { none: { userId, status: 'SOLVED' } } },
      ];
    }

    // 'solvedCount' sorts by popularity (number of users who solved it)
    const orderBy: any =
      sortBy === 'solvedCount'
        ? { userProblems: { _count: order } }
        : { [sortBy]: order };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          points: true,
          createdAt: true,
          tags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          _count: {
            select: {
              submissions: true,
              userProblems: { where: { status: 'SOLVED' } },
            },
          },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    const problemIds = problems.map((p) => p.id);

    // Accepted submission counts → acceptance rate
    const acceptedGroups = problemIds.length
      ? await prisma.submission.groupBy({
          by: ['problemId'],
          where: { problemId: { in: problemIds }, verdict: 'ACCEPTED' },
          _count: { _all: true },
        })
      : [];
    const acceptedMap = new Map(acceptedGroups.map((g) => [g.problemId, g._count._all]));

    // Per-user status
    const solvedSet = new Set<string>();
    const attemptedSet = new Set<string>();
    if (userId && problemIds.length) {
      const [solved, attempted] = await Promise.all([
        prisma.userProblem.findMany({
          where: { userId, problemId: { in: problemIds }, status: 'SOLVED' },
          select: { problemId: true },
        }),
        prisma.submission.findMany({
          where: { userId, problemId: { in: problemIds } },
          select: { problemId: true },
          distinct: ['problemId'],
        }),
      ]);
      solved.forEach((s) => solvedSet.add(s.problemId));
      attempted.forEach((s) => attemptedSet.add(s.problemId));
    }

    // Flatten tags and add counts
    const formattedProblems = problems.map((p) => {
      const accepted = acceptedMap.get(p.id) ?? 0;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        points: p.points,
        createdAt: p.createdAt,
        tags: p.tags.map((t) => t.tag),
        submissionCount: p._count.submissions,
        solvedCount: p._count.userProblems,
        acceptedCount: accepted,
        acceptanceRate: p._count.submissions > 0 ? Math.round((accepted / p._count.submissions) * 1000) / 10 : null,
        userStatus: !userId
          ? null
          : solvedSet.has(p.id)
            ? 'SOLVED'
            : attemptedSet.has(p.id)
              ? 'ATTEMPTED'
              : 'NONE',
      };
    });

    return reply.send(
      successResponse({
        data: formattedProblems,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  });

  // Get single problem by slug
  app.get('/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();
    const problem = await prisma.problem.findUnique({
      where: { slug: request.params.slug },
      include: {
        tags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
        testCases: {
          where: { isExample: true },
          select: { id: true, input: true, expectedOutput: true, explanation: true },
          orderBy: { orderIndex: 'asc' },
        },
        author: {
          select: { handle: true, avatar: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!problem) {
      throw new NotFoundError('Problem');
    }

    // Non-admin users can only see PUBLISHED problems
    if (problem.status !== 'PUBLISHED' && request.user?.role !== 'ADMIN') {
      throw new NotFoundError('Problem');
    }

    return reply.send(
      successResponse({
        problem: {
          id: problem.id,
          slug: problem.slug,
          title: problem.title,
          statement: problem.statement,
          inputFormat: problem.inputFormat,
          outputFormat: problem.outputFormat,
          constraints: problem.constraints,
          difficulty: problem.difficulty,
          timeLimitMs: problem.timeLimitMs,
          memoryLimitMb: problem.memoryLimitMb,
          points: problem.points,
          checkerType: problem.checkerType,
          status: problem.status,
          createdAt: problem.createdAt,
          author: problem.author,
          tags: problem.tags.map((t) => t.tag),
          testCases: problem.testCases,
          submissionCount: problem._count.submissions,
        },
      }),
    );
  });

  // ─── Admin Routes ─────────────────────────────────────────────────────────

  // Create problem
  app.post(
    '/',
    { preHandler: [authenticate, authorize('ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createProblemSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid problem data', parsed.error.flatten().fieldErrors);
      }

      const { tags, ...problemData } = parsed.data;
      const prisma = getPrisma();

      const existing = await prisma.problem.findUnique({ where: { slug: problemData.slug } });
      if (existing) {
        throw new ConflictError('A problem with this slug already exists');
      }

      // Handle tags - connect existing or create new ones
      const tagConnections = [];
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        tagConnections.push({ tagId: tag.id });
      }

      const problem = await prisma.problem.create({
        data: {
          slug: problemData.slug,
          title: problemData.title,
          statement: problemData.statement,
          inputFormat: problemData.inputFormat,
          outputFormat: problemData.outputFormat,
          constraints: problemData.constraints,
          difficulty: problemData.difficulty,
          timeLimitMs: problemData.timeLimitMs,
          memoryLimitMb: problemData.memoryLimitMb,
          authorId: request.user!.sub,
          status: 'PUBLISHED',
          tags: { create: tagConnections },
        },
        include: {
          tags: { select: { tag: true } },
        },
      });

      return reply.status(201).send(
        successResponse({
          problem: { ...problem, tags: problem.tags.map((t) => t.tag) },
        }),
      );
    },
  );

  // Add test case to problem
  app.post(
    '/:slug/testcases',
    { preHandler: [authenticate, authorize('ADMIN')] },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const parsed = createTestCaseSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid test case data', parsed.error.flatten().fieldErrors);
      }

      const prisma = getPrisma();
      const problem = await prisma.problem.findUnique({ where: { slug: request.params.slug } });

      if (!problem) throw new NotFoundError('Problem');

      const testCase = await prisma.testCase.create({
        data: {
          ...parsed.data,
          problemId: problem.id,
        },
      });

      return reply.status(201).send(successResponse({ testCase }));
    },
  );

  // Get all tags
  app.get('/tags/all', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { problems: true } },
      },
    });

    return reply.send(
      successResponse({
        tags: tags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          problemCount: t._count.problems,
        })),
      }),
    );
  });
}

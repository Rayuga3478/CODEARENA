import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.js';

/** Penalty minutes added for each rejected attempt before the first AC (ICPC rule). */
const WRONG_ATTEMPT_PENALTY_MIN = 20;
/** Verdicts that do not count as a penalized attempt. */
const NON_PENALIZED = new Set(['COMPILATION_ERROR', 'QUEUED', 'JUDGING', 'INTERNAL_ERROR']);

const contestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(['DRAFT', 'UPCOMING', 'RUNNING', 'ENDED']).optional(),
});

export async function contestRoutes(app: FastifyInstance): Promise<void> {
  // List contests
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = contestQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters');
    }

    const { page, limit, status } = parsed.data;
    const skip = (page - 1) * limit;
    const prisma = getPrisma();

    const where: any = { visibility: 'PUBLIC' };
    if (status) where.status = status;

    const [contests, total] = await Promise.all([
      prisma.contest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          duration: true,
          status: true,
          _count: { select: { participants: true, problems: true } },
        },
      }),
      prisma.contest.count({ where }),
    ]);

    return reply.send(
      successResponse({
        data: contests.map((c) => ({
          ...c,
          participantCount: c._count.participants,
          problemCount: c._count.problems,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }),
    );
  });

  // Get contest detail
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const prisma = getPrisma();

    const contest = await prisma.contest.findUnique({
      where: { id: request.params.id },
      include: {
        problems: {
          orderBy: { orderIndex: 'asc' },
          select: {
            label: true,
            orderIndex: true,
            points: true,
            problem: {
              select: { id: true, slug: true, title: true, difficulty: true },
            },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!contest) throw new NotFoundError('Contest');

    const isRegistered = request.user
      ? !!(await prisma.contestParticipant.findUnique({
          where: { contestId_userId: { contestId: contest.id, userId: request.user.sub } },
          select: { userId: true },
        }))
      : false;

    return reply.send(
      successResponse({
        contest: {
          ...contest,
          participantCount: contest._count.participants,
          isRegistered,
          // Only show problems if contest is running or ended
          problems: contest.status === 'RUNNING' || contest.status === 'ENDED'
            ? contest.problems
            : [],
        },
      }),
    );
  });

  // Register for contest
  app.post(
    '/:id/register',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const prisma = getPrisma();

      const contest = await prisma.contest.findUnique({
        where: { id: request.params.id },
        select: { id: true, status: true },
      });

      if (!contest) throw new NotFoundError('Contest');
      if (contest.status !== 'UPCOMING' && contest.status !== 'RUNNING') {
        throw new ValidationError('Registration is closed for this contest');
      }

      await prisma.contestParticipant.upsert({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: request.user!.sub,
          },
        },
        update: {},
        create: {
          contestId: contest.id,
          userId: request.user!.sub,
        },
      });

      return reply.send(successResponse({ message: 'Registered successfully' }));
    },
  );

  // Get contest standings — ICPC rules, aggregated from contest submissions
  app.get('/:id/standings', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();

    const contest = await prisma.contest.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        status: true,
        startTime: true,
        problems: {
          orderBy: { orderIndex: 'asc' },
          select: { label: true, problemId: true },
        },
      },
    });

    if (!contest) throw new NotFoundError('Contest');

    const participants = await prisma.contestParticipant.findMany({
      where: { contestId: contest.id },
      select: { userId: true, user: { select: { handle: true, rating: true, avatar: true } } },
    });

    // All judged contest submissions in chronological order
    const submissions = await prisma.submission.findMany({
      where: { contestId: contest.id },
      select: { userId: true, problemId: true, verdict: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    type Cell = { label: string; solved: boolean; attempts: number; timeMin: number | null; firstBlood: boolean };
    const startMs = contest.startTime.getTime();
    const cells = new Map<string, Map<string, Cell>>(); // userId → problemId → cell
    const labelOf = new Map(contest.problems.map((p) => [p.problemId, p.label]));
    const firstSolve = new Map<string, number>(); // problemId → earliest AC ms

    for (const sub of submissions) {
      const label = labelOf.get(sub.problemId);
      if (!label || NON_PENALIZED.has(sub.verdict)) continue;

      let userCells = cells.get(sub.userId);
      if (!userCells) { userCells = new Map(); cells.set(sub.userId, userCells); }
      let cell = userCells.get(sub.problemId);
      if (!cell) { cell = { label, solved: false, attempts: 0, timeMin: null, firstBlood: false }; userCells.set(sub.problemId, cell); }
      if (cell.solved) continue;

      cell.attempts += 1;
      if (sub.verdict === 'ACCEPTED') {
        cell.solved = true;
        cell.timeMin = Math.max(0, Math.floor((sub.createdAt.getTime() - startMs) / 60000));
        const t = sub.createdAt.getTime();
        if (!firstSolve.has(sub.problemId) || t < firstSolve.get(sub.problemId)!) firstSolve.set(sub.problemId, t);
      }
    }

    const standings = participants
      .map((p) => {
        const userCells = cells.get(p.userId) ?? new Map<string, Cell>();
        let solved = 0;
        let penalty = 0;
        let lastAcMin = 0;
        const problems = contest.problems.map(({ problemId, label }) => {
          const c = userCells.get(problemId) ?? { label, solved: false, attempts: 0, timeMin: null, firstBlood: false };
          if (c.solved && c.timeMin !== null) {
            solved += 1;
            penalty += c.timeMin + (c.attempts - 1) * WRONG_ATTEMPT_PENALTY_MIN;
            lastAcMin = Math.max(lastAcMin, c.timeMin);
          }
          return c;
        });
        return {
          userId: p.userId,
          handle: p.user.handle,
          avatar: p.user.avatar,
          rating: p.user.rating,
          solved,
          penalty,
          lastAcMin,
          problems,
        };
      })
      .sort((a, b) => b.solved - a.solved || a.penalty - b.penalty || a.lastAcMin - b.lastAcMin || a.handle.localeCompare(b.handle))
      .map(({ userId, ...s }, i) => {
        // Mark first-blood cells (earliest AC on each problem)
        s.problems.forEach((c, idx) => {
          const pid = contest.problems[idx]!.problemId;
          const fs = firstSolve.get(pid);
          if (c.solved && fs !== undefined && c.timeMin === Math.max(0, Math.floor((fs - startMs) / 60000))) {
            const firstUser = submissions.find((x) => x.problemId === pid && x.verdict === 'ACCEPTED' && x.createdAt.getTime() === fs);
            c.firstBlood = firstUser?.userId === userId;
          }
        });
        return { rank: i + 1, ...s };
      });

    return reply.send(
      successResponse({
        standings,
        problems: contest.problems.map((p) => p.label),
        penaltyPerWrongAttempt: WRONG_ATTEMPT_PENALTY_MIN,
      }),
    );
  });
}

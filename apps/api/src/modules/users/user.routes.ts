import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const leaderboardQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  period: z.enum(['all', 'week', 'month']).default('all'),
  country: z.string().max(64).optional(),
  search: z.string().max(64).optional(),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Platform-wide statistics (public, used by the landing page)
  app.get('/stats/platform', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();
    const [users, problems, submissions, accepted, contests, languages] = await Promise.all([
      prisma.user.count({ where: { isDisabled: false } }),
      prisma.problem.count({ where: { status: 'PUBLISHED' } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { verdict: 'ACCEPTED' } }),
      prisma.contest.count({ where: { visibility: 'PUBLIC' } }),
      prisma.language.findMany({ where: { isActive: true }, select: { slug: true, displayName: true } }),
    ]);
    return reply.send(successResponse({ users, problems, submissions, accepted, contests, languages }));
  });

  // Leaderboard
  //  - period=all   → ranked by rating (ties: solved count)
  //  - period=week/month → ranked by problems first solved inside the window
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = leaderboardQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters');
    const { page, limit, period, country, search } = parsed.data;
    const prisma = getPrisma();

    const userWhere: any = { isDisabled: false };
    if (country) userWhere.country = { equals: country, mode: 'insensitive' };
    if (search) userWhere.handle = { contains: search.toLowerCase() };

    const userSelect = {
      id: true,
      handle: true,
      avatar: true,
      country: true,
      rating: true,
      maxRating: true,
      _count: { select: { contestsJoined: true } },
    } as const;

    let rows: Array<{ user: any; periodSolved: number | null }>;
    let total: number;

    if (period === 'all') {
      const [users, count] = await Promise.all([
        prisma.user.findMany({
          where: userWhere,
          orderBy: [{ rating: 'desc' }, { createdAt: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: userSelect,
        }),
        prisma.user.count({ where: userWhere }),
      ]);
      rows = users.map((u) => ({ user: u, periodSolved: null }));
      total = count;
    } else {
      const since = new Date(Date.now() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000);
      const groups = await prisma.userProblem.groupBy({
        by: ['userId'],
        where: { status: 'SOLVED', firstSolvedAt: { gte: since }, user: userWhere },
        _count: { _all: true },
      });
      groups.sort((a, b) => b._count._all - a._count._all);
      total = groups.length;
      const pageGroups = groups.slice((page - 1) * limit, page * limit);
      const users = await prisma.user.findMany({
        where: { id: { in: pageGroups.map((g) => g.userId) } },
        select: userSelect,
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      rows = pageGroups
        .filter((g) => byId.has(g.userId))
        .map((g) => ({ user: byId.get(g.userId), periodSolved: g._count._all }));
    }

    const ids = rows.map((r) => r.user.id);
    const [solvedGroups, lastChanges] = await Promise.all([
      ids.length
        ? prisma.userProblem.groupBy({
            by: ['userId'],
            where: { userId: { in: ids }, status: 'SOLVED' },
            _count: { _all: true },
          })
        : [],
      ids.length
        ? prisma.ratingHistory.findMany({
            where: { userId: { in: ids } },
            orderBy: { createdAt: 'desc' },
            distinct: ['userId'],
            select: { userId: true, ratingBefore: true, ratingAfter: true },
          })
        : [],
    ]);
    const solvedMap = new Map(solvedGroups.map((g) => [g.userId, g._count._all]));
    const changeMap = new Map(lastChanges.map((c) => [c.userId, c.ratingAfter - c.ratingBefore]));

    const data = rows.map((r, i) => ({
      rank: (page - 1) * limit + i + 1,
      handle: r.user.handle,
      avatar: r.user.avatar,
      country: r.user.country,
      rating: r.user.rating,
      maxRating: r.user.maxRating,
      contestCount: r.user._count.contestsJoined,
      solvedCount: solvedMap.get(r.user.id) ?? 0,
      periodSolved: r.periodSolved,
      lastChange: changeMap.get(r.user.id) ?? null,
    }));

    // Distinct countries for the country filter
    const countryRows = await prisma.user.findMany({
      where: { isDisabled: false, country: { not: null } },
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    });

    return reply.send(
      successResponse({
        data,
        countries: countryRows.map((c) => c.country).filter(Boolean),
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      }),
    );
  });

  // Get user profile by handle
  app.get('/:handle', async (request: FastifyRequest<{ Params: { handle: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { handle: request.params.handle.toLowerCase() },
      select: {
        id: true,
        handle: true,
        avatar: true,
        bio: true,
        country: true,
        rating: true,
        maxRating: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            submissions: true,
            contestsJoined: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get solved problems count
    const solvedCount = await prisma.userProblem.count({
      where: { userId: user.id, status: 'SOLVED' },
    });

    // Get recent submissions
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        verdict: true,
        executionTimeMs: true,
        memoryUsedKb: true,
        languageId: true,
        createdAt: true,
        problem: { select: { slug: true, title: true } },
      },
    });

    // Get rating history
    const ratingHistory = await prisma.ratingHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        ratingBefore: true,
        ratingAfter: true,
        rank: true,
        createdAt: true,
        contest: { select: { title: true } },
      },
    });

    // ── Extended stats ──
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const [yearSubs, verdictGroups, languageGroups, solvedTags, higherRated, recentContests, languages] = await Promise.all([
      prisma.submission.findMany({
        where: { userId: user.id, createdAt: { gte: yearAgo } },
        select: { createdAt: true },
      }),
      prisma.submission.groupBy({
        by: ['verdict'],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.submission.groupBy({
        by: ['languageId'],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.problemTag.findMany({
        where: { problem: { userProblems: { some: { userId: user.id, status: 'SOLVED' } } } },
        select: { tag: { select: { name: true, color: true } } },
      }),
      prisma.user.count({ where: { isDisabled: false, rating: { gt: user.rating } } }),
      prisma.contestParticipant.findMany({
        where: { userId: user.id },
        orderBy: { contest: { startTime: 'desc' } },
        take: 5,
        select: { contest: { select: { id: true, title: true, startTime: true, status: true } } },
      }),
      prisma.language.findMany({ select: { id: true, slug: true, displayName: true } }),
    ]);

    // Daily activity map (UTC date → count)
    const activity: Record<string, number> = {};
    for (const s of yearSubs) {
      const day = s.createdAt.toISOString().slice(0, 10);
      activity[day] = (activity[day] ?? 0) + 1;
    }

    // Streaks (consecutive UTC days with ≥1 submission)
    const dayMs = 24 * 60 * 60 * 1000;
    const todayKey = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    {
      let cursor = new Date(todayKey).getTime();
      // Allow the streak to continue if today has no submission yet
      if (!activity[todayKey]) cursor -= dayMs;
      while (activity[new Date(cursor).toISOString().slice(0, 10)]) {
        currentStreak += 1;
        cursor -= dayMs;
      }
    }
    let maxStreak = 0;
    {
      const days = Object.keys(activity).sort();
      let run = 0;
      let prev = 0;
      for (const d of days) {
        const t = new Date(d).getTime();
        run = prev && t - prev === dayMs ? run + 1 : 1;
        maxStreak = Math.max(maxStreak, run);
        prev = t;
      }
    }

    const tagCounts = new Map<string, { name: string; color: string; count: number }>();
    for (const { tag } of solvedTags) {
      const t = tagCounts.get(tag.name) ?? { ...tag, count: 0 };
      t.count += 1;
      tagCounts.set(tag.name, t);
    }

    const langById = new Map(languages.map((l) => [l.id, l]));

    return reply.send(
      successResponse({
        user: {
          id: user.id,
          handle: user.handle,
          avatar: user.avatar,
          bio: user.bio,
          country: user.country,
          rating: user.rating,
          maxRating: user.maxRating,
          role: user.role,
          createdAt: user.createdAt,
          submissionCount: user._count.submissions,
          solvedCount,
          recentSubmissions: recentSubmissions.map((s) => ({
            ...s,
            language: langById.get(s.languageId)?.displayName ?? null,
          })),
          ratingHistory,
          contestCount: user._count.contestsJoined,
          globalRank: higherRated + 1,
          acceptedCount: verdictGroups.find((g) => g.verdict === 'ACCEPTED')?._count._all ?? 0,
          currentStreak,
          maxStreak,
          activity,
          tagStats: [...tagCounts.values()].sort((a, b) => b.count - a.count),
          verdictStats: verdictGroups.map((g) => ({ verdict: g.verdict, count: g._count._all })),
          languageStats: languageGroups.map((g) => ({
            language: langById.get(g.languageId)?.displayName ?? 'Unknown',
            count: g._count._all,
          })),
          recentContests: recentContests.map((c) => c.contest),
        },
      }),
    );
  });
}
